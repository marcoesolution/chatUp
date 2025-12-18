import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/modules/auth"; 
import { encryptMessage, decryptMessage, ensureSignalSession } from "@/core/security";
import { getMessages, insertMessage, markAsRead as markAsReadLocal } from "@/core/database";
import { socketService } from "@/services/api/socket.service";
import api from "@/services/api";
import type { Message, CreateMessageData } from "../types";

// Helper to generate a consistent chat ID (users sorted alphabetically)
function generateChatId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

const MESSAGES_PER_PAGE = 20;

export function useMessages(contactId: string) {
  const { user } = useAuth(); 
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const chatIdRef = useRef<string | null>(null);

  // Load from local SQLite
  const loadMessagesFromLocal = useCallback(
    async (chatId: string, limit: number = MESSAGES_PER_PAGE, offset: number = 0) => {
      try {
        return await getMessages(chatId, limit, offset);
      } catch (err) {
        console.error("❌ Error loading local messages:", err);
        return [];
      }
    },
    []
  );

  const syncMessagesWithBackend = useCallback(async (chatId: string, currentUserId: string) => {
      try {
          const response = await api.get(`/chat/messages/${contactId}`, {
              params: { limit: MESSAGES_PER_PAGE, offset: 0 }
          });
          const backendMsgs = response.data;

          for (const bm of backendMsgs) {
              let decryptedText = bm.content; 
              try {
                  decryptedText = await decryptMessage(
                      bm.content, 
                      chatId, 
                      currentUserId, 
                      bm.senderId, 
                      bm.receiverId
                  );
              } catch(e) {
                  console.warn("Sync decryption error:", e);
              }

              const msgObj: Message = {
                  id: bm.id,
                  chatId,
                  senderId: bm.senderId,
                  receiverId: bm.receiverId,
                  text: decryptedText,
                  timestamp: new Date(bm.timestamp),
                  read: bm.isRead,
                  viewedAt: null,
                  createdAt: new Date(bm.timestamp),
                  updatedAt: new Date(bm.timestamp),
              };

              await insertMessage({
                  ...msgObj,
                  encryptedText: bm.content,
                  isLocal: false
              });
          }
      } catch (err) {
          console.error("❌ Error syncing with backend:", err);
      }
  }, [contactId]);

  const refreshMessages = useCallback(
    async (chatId: string, currentUserId: string) => {
      // 1. Load local immediately for speed
      const localMessages = await loadMessagesFromLocal(chatId, MESSAGES_PER_PAGE, 0);
      setMessages(localMessages);
      
      // 2. Sync with backend in background
      await syncMessagesWithBackend(chatId, currentUserId);
      
      // 3. Reload from local after sync
      const syncedMessages = await loadMessagesFromLocal(chatId, MESSAGES_PER_PAGE, 0);
      setMessages(syncedMessages);
      setHasMore(syncedMessages.length >= MESSAGES_PER_PAGE);
    },
    [loadMessagesFromLocal, syncMessagesWithBackend]
  );

  // Initial Load & Socket Setup
  useEffect(() => {
    if (!user || !contactId) {
      setIsLoading(false);
      return;
    }

    const currentUserId = user.id;
    const chatId = generateChatId(currentUserId, contactId);
    chatIdRef.current = chatId;

    // Connect Socket
    socketService.connect(currentUserId);

    // Initial Load
    (async () => {
      setIsLoading(true);
      try {
        await refreshMessages(chatId, currentUserId);
        
        // Ensure Signal Session
        try {
            await ensureSignalSession(currentUserId, contactId);
        } catch(e) {
            console.warn("Signal session warning:", e);
        }

        setIsLoading(false);
      } catch (e) {
        console.error("Init Error", e);
        setError("Failed to load messages");
        setIsLoading(false);
      }
    })();

    // Socket Listener
    const handleNewMessage = async (backendMsg: any) => {
       if (backendMsg.senderId === currentUserId) return; 
       if (backendMsg.senderId !== contactId) return; 

       console.log("📩 Received new message via Socket:", backendMsg.id);

       try {
           let decryptedText = backendMsg.content;
           try {
               decryptedText = await decryptMessage(
                   backendMsg.content, 
                   chatId, 
                   currentUserId, 
                   backendMsg.senderId, 
                   backendMsg.receiverId
               );
           } catch(e) {
               console.warn("Socket decryption error:", e);
           }
           
           const newMessage: Message = {
               id: backendMsg.id,
               chatId,
               senderId: backendMsg.senderId,
               receiverId: backendMsg.receiverId,
               text: decryptedText,
               timestamp: new Date(backendMsg.timestamp),
               read: false,
               viewedAt: null,
               createdAt: new Date(backendMsg.timestamp),
               updatedAt: new Date(backendMsg.timestamp),
           };

           await insertMessage({
               ...newMessage,
               encryptedText: backendMsg.content,
               isLocal: false
           });

            setMessages((prev) => {
                const combined = [...prev, newMessage];
                 const unique = combined.reduce((acc, msg) => {
                    if (!acc.find((m) => m.id === msg.id)) {
                        acc.push(msg);
                    }
                    return acc;
                }, [] as Message[]);
                unique.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                return unique;
            });

            await markAsReadLocal(chatId, currentUserId);
       } catch (err) {
           console.error("Error handling incoming socket message", err);
       }
    };

    socketService.onNewMessage(handleNewMessage);

    return () => {
      socketService.offNewMessage();
    };
  }, [user?.id, contactId, refreshMessages]);


  // Send Message
  const sendMessage = useCallback(async (messageData: CreateMessageData) => {
    if (!user) throw new Error("Not authenticated");
    
    const currentUserId = user.id;
    const chatId = chatIdRef.current || generateChatId(currentUserId, messageData.receiverId);
    const plaintext = messageData.text.trim();
    if (!plaintext) return;

    const now = new Date();
    const tempId = `local_${Date.now()}`;

    // 1. Optimistic UI
    const tempMessage: Message = {
        id: tempId,
        chatId,
        senderId: currentUserId,
        receiverId: messageData.receiverId,
        text: plaintext,
        timestamp: now,
        read: false,
        viewedAt: null,
        createdAt: now,
        updatedAt: now,
    };

    setMessages(prev => [...prev, tempMessage].sort((a,b) => a.timestamp.getTime() - b.timestamp.getTime()));

    // 2. Encrypt
    let encryptedText = plaintext; 
    try {
        encryptedText = await encryptMessage(plaintext, chatId, currentUserId, messageData.receiverId);
    } catch(e) {
        console.error("Encryption failed", e);
    }

    // 3. Insert Local
    await insertMessage({
        ...tempMessage,
        encryptedText, 
        isLocal: true
    });

    // 4. Send via Socket
    socketService.sendMessage({
        senderId: currentUserId,
        receiverId: messageData.receiverId,
        content: encryptedText
    });
  }, [user]);

  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMore || !user) return;
    
    setIsLoadingMore(true);
    const currentUserId = user.id;
    const chatId = chatIdRef.current || generateChatId(currentUserId, contactId);

    try {
      // 1. Try local first
      const localMessages = await loadMessagesFromLocal(chatId, MESSAGES_PER_PAGE, messages.length);
      
      if (localMessages.length > 0) {
        setMessages(prev => {
            const combined = [...localMessages, ...prev];
            const unique = combined.reduce((acc, msg) => {
                if (!acc.find((m) => m.id === msg.id)) {
                    acc.push(msg);
                }
                return acc;
            }, [] as Message[]);
            unique.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            return unique;
        });
        setHasMore(localMessages.length >= MESSAGES_PER_PAGE);
      } else {
        // 2. Try backend for older messages
        const response = await api.get(`/chat/messages/${contactId}`, {
          params: { limit: MESSAGES_PER_PAGE, offset: messages.length }
        });
        const backendMsgs = response.data;
        
        if (backendMsgs.length > 0) {
            const processedMsgs: Message[] = [];
            for (const bm of backendMsgs) {
                let decryptedText = bm.content;
                try {
                    decryptedText = await decryptMessage(
                        bm.content, 
                        chatId, 
                        currentUserId, 
                        bm.senderId, 
                        bm.receiverId
                    );
                } catch(e) {
                    console.warn("Load more decryption error:", e);
                }

                const msgObj: Message = {
                    id: bm.id,
                    chatId,
                    senderId: bm.senderId,
                    receiverId: bm.receiverId,
                    text: decryptedText,
                    timestamp: new Date(bm.timestamp),
                    read: bm.isRead,
                    viewedAt: null,
                    createdAt: new Date(bm.timestamp),
                    updatedAt: new Date(bm.timestamp),
                };

                await insertMessage({
                    ...msgObj,
                    encryptedText: bm.content,
                    isLocal: false
                });
                processedMsgs.push(msgObj);
            }

            setMessages(prev => {
                const combined = [...processedMsgs, ...prev];
                 const unique = combined.reduce((acc, msg) => {
                    if (!acc.find((m) => m.id === msg.id)) {
                        acc.push(msg);
                    }
                    return acc;
                }, [] as Message[]);
                unique.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                return unique;
            });
            setHasMore(backendMsgs.length >= MESSAGES_PER_PAGE);
        } else {
            setHasMore(false);
        }
      }
    } catch (e) {
      console.error("Load more error", e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [user, contactId, isLoadingMore, hasMore, loadMessagesFromLocal, messages.length]);
  
  const markAsViewed = useCallback(async () => {
      if (user && contactId) {
          const currentUserId = user.id;
          const chatId = chatIdRef.current || generateChatId(currentUserId, contactId);
          await markAsReadLocal(chatId, currentUserId);
      }
  }, [user, contactId]);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    loadMoreMessages,
    hasMore,
    isLoadingMore,
    markAsViewed
  };
}
