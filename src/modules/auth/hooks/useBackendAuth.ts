import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authService } from "@/services/api/auth.service";
import type { UserProfile, CreateProfileData, AuthResponse } from "../types";
import { getOrCreateKeyPair } from "@/core/security";
import { bootstrapSignalAccount } from "@/core/security/signal";

const STORAGE_KEY_TOKEN = "auth.token";
const STORAGE_KEY_USER = "auth.user";

interface BackendUser {
  uid: string; // Mapped from backend ID
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  // Mock Firebase methods if needed (e.g. getIdToken)
  getIdToken: () => Promise<string>;
}

export function useBackendAuth() {
  const [user, setUser] = useState<BackendUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Restore session
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await AsyncStorage.getItem(STORAGE_KEY_TOKEN);
        const savedUserStr = await AsyncStorage.getItem(STORAGE_KEY_USER);

        if (token && savedUserStr) {
          const savedUser = JSON.parse(savedUserStr);
          setUser(savedUser);
          // TODO: Fetch fresh profile from backend
          // For now, reconstruct profile from saved user
          setUserProfile({
             id: savedUser.uid,
             email: savedUser.email || "",
             displayName: savedUser.displayName || "",
             hasProfile: true, // Assume true if logged in for MVP
             photoURL: savedUser.photoURL,
          });
        }
      } catch (e) {
        console.error("Failed to restore session", e);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login({ email, password });
      
      const backendUser: BackendUser = {
        uid: response.user.id,
        email: response.user.email,
        displayName: response.user.name,
        photoURL: null, // Backend needs to return this
        getIdToken: async () => response.token,
      };

      await AsyncStorage.setItem(STORAGE_KEY_TOKEN, response.token);
      await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(backendUser));

      setUser(backendUser);
      setUserProfile({
         id: backendUser.uid,
         email: backendUser.email || "",
         displayName: backendUser.displayName || "",
         hasProfile: true,
      });

      // Initialize Crypto
      try {
          await getOrCreateKeyPair(backendUser.uid);
          await bootstrapSignalAccount(backendUser.uid);
      } catch(e) {
          console.warn("Crypto init failed", e);
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Login failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.register({ email, password, name });
      
      // Auto-login after register logic usually goes here
      // For now, we reuse the response to mock a "logged in" state or ask user to login
      // Since backend register endpoint returns user but not token in my simple impl,
      // let's call login immediately.
      await signIn(email, password);

    } catch (err: any) {
      setError(err.message || "Register failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
     await AsyncStorage.removeItem(STORAGE_KEY_TOKEN);
     await AsyncStorage.removeItem(STORAGE_KEY_USER);
     setUser(null);
     setUserProfile(null);
  };

  // Mock unimplemented methods
  const createProfile = async (id: string, data: CreateProfileData) => { 
    setIsLoading(true);
    try {
      await authService.updateProfile(id, data);
      
      // Update local state
      if (user) {
        // Fetch fresh User or update local state manually
        const updatedUser: BackendUser = { ...user, displayName: data.displayName, photoURL: data.photoURL || null };
        setUser(updatedUser);
        
        setUserProfile({
          id: user.uid,
          email: user.email || "",
          displayName: data.displayName,
          photoURL: data.photoURL,
          bio: data.bio,
          phoneNumber: data.phoneNumber,
          hasProfile: true
        });
        
        // Persist
        await AsyncStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
      }
    } catch (e: any) {
        console.error("Create Profile Failed", e);
        throw e;
    } finally {
        setIsLoading(false);
    }
  };
  const refreshProfile = async () => {};
  const signInWithGoogle = async () => { console.warn("Not Implemented"); };
  const syncPhotoURL = async () => {};

  return {
    user,
    userProfile,
    isAuthenticated: !!user,
    hasCompleteProfile: !!user, // Simplified
    isLoading,
    error,
    signIn,
    signUp,
    signInWithGoogle,
    createProfile,
    logout,
    refreshProfile,
    syncPhotoURL,
  };
}
