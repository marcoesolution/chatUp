/**
 * Exemplos de uso do Firebase no projeto ChatUp
 * 
 * Este arquivo contém exemplos práticos de como usar os serviços do Firebase.
 * Use estes exemplos como referência ao implementar funcionalidades.
 */

import { auth, db, storage } from './config';
import {
  // Auth
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  // Firestore
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  // Storage
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/firestore';
import type { FirebaseUser } from './types';

// ============================================================================
// EXEMPLOS DE AUTENTICAÇÃO
// ============================================================================

/**
 * Exemplo: Login com email e senha
 */
export async function exampleLogin(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth!, email, password);
    const user = userCredential.user;
    console.log('Usuário logado:', user.uid);
    return user;
  } catch (error: any) {
    console.error('Erro ao fazer login:', error.message);
    throw error;
  }
}

/**
 * Exemplo: Criar novo usuário
 */
export async function exampleSignUp(email: string, password: string, displayName: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth!, email, password);
    const user = userCredential.user;
    
    // Atualizar perfil do usuário
    await updateProfile(user, { displayName });
    
    // Criar documento do usuário no Firestore
    await setDoc(doc(db!, 'users', user.uid), {
      email: user.email,
      displayName,
      createdAt: new Date(),
    });
    
    console.log('Usuário criado:', user.uid);
    return user;
  } catch (error: any) {
    console.error('Erro ao criar usuário:', error.message);
    throw error;
  }
}

/**
 * Exemplo: Logout
 */
export async function exampleLogout() {
  try {
    await signOut(auth!);
    console.log('Usuário deslogado');
  } catch (error: any) {
    console.error('Erro ao fazer logout:', error.message);
    throw error;
  }
}

/**
 * Exemplo: Observar mudanças no estado de autenticação
 */
export function exampleAuthStateListener(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth!, (user) => {
    if (user) {
      console.log('Usuário autenticado:', user.uid);
    } else {
      console.log('Usuário não autenticado');
    }
    callback(user);
  });
}

// ============================================================================
// EXEMPLOS DE FIRESTORE
// ============================================================================

/**
 * Exemplo: Criar documento
 */
export async function exampleCreateDocument(collectionName: string, data: any, documentId?: string) {
  try {
    if (documentId) {
      // Criar com ID específico
      await setDoc(doc(db!, collectionName, documentId), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return documentId;
    } else {
      // Criar com ID automático
      const docRef = await addDoc(collection(db!, collectionName), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return docRef.id;
    }
  } catch (error: any) {
    console.error('Erro ao criar documento:', error.message);
    throw error;
  }
}

/**
 * Exemplo: Ler documento único
 */
export async function exampleGetDocument(collectionName: string, documentId: string) {
  try {
    const docRef = doc(db!, collectionName, documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      throw new Error('Documento não encontrado');
    }
  } catch (error: any) {
    console.error('Erro ao ler documento:', error.message);
    throw error;
  }
}

/**
 * Exemplo: Ler todos os documentos de uma coleção
 */
export async function exampleGetAllDocuments(collectionName: string) {
  try {
    const querySnapshot = await getDocs(collection(db!, collectionName));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error: any) {
    console.error('Erro ao ler documentos:', error.message);
    throw error;
  }
}

/**
 * Exemplo: Atualizar documento
 */
export async function exampleUpdateDocument(
  collectionName: string,
  documentId: string,
  data: any
) {
  try {
    const docRef = doc(db!, collectionName, documentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date(),
    });
    console.log('Documento atualizado:', documentId);
  } catch (error: any) {
    console.error('Erro ao atualizar documento:', error.message);
    throw error;
  }
}

/**
 * Exemplo: Deletar documento
 */
export async function exampleDeleteDocument(collectionName: string, documentId: string) {
  try {
    await deleteDoc(doc(db!, collectionName, documentId));
    console.log('Documento deletado:', documentId);
  } catch (error: any) {
    console.error('Erro ao deletar documento:', error.message);
    throw error;
  }
}

/**
 * Exemplo: Consulta com filtros
 */
export async function exampleQueryWithFilters(
  collectionName: string,
  field: string,
  operator: any,
  value: any
) {
  try {
    const q = query(
      collection(db!, collectionName),
      where(field, operator, value),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error: any) {
    console.error('Erro ao consultar documentos:', error.message);
    throw error;
  }
}

// ============================================================================
// EXEMPLOS DE STORAGE
// ============================================================================

/**
 * Exemplo: Upload de arquivo
 */
export async function exampleUploadFile(
  file: Blob | Uint8Array | ArrayBuffer,
  path: string,
  fileName: string
) {
  try {
    const storageRef = ref(storage!, `${path}/${fileName}`);
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Arquivo enviado:', snapshot.metadata.fullPath);
    
    // Obter URL de download
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error('Erro ao fazer upload:', error.message);
    throw error;
  }
}

/**
 * Exemplo: Obter URL de download
 */
export async function exampleGetDownloadURL(path: string) {
  try {
    const storageRef = ref(storage!, path);
    const url = await getDownloadURL(storageRef);
    return url;
  } catch (error: any) {
    console.error('Erro ao obter URL:', error.message);
    throw error;
  }
}

/**
 * Exemplo: Deletar arquivo
 */
export async function exampleDeleteFile(path: string) {
  try {
    const storageRef = ref(storage!, path);
    await deleteObject(storageRef);
    console.log('Arquivo deletado:', path);
  } catch (error: any) {
    console.error('Erro ao deletar arquivo:', error.message);
    throw error;
  }
}

