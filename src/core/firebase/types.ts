import { User } from 'firebase/auth';
import { 
  DocumentData, 
  QueryDocumentSnapshot, 
  Timestamp 
} from 'firebase/firestore';

/**
 * Tipo para usuário do Firebase Auth
 */
export type FirebaseUser = User;

/**
 * Tipo para documento do Firestore
 */
export type FirestoreDocument<T = DocumentData> = QueryDocumentSnapshot<T>;

/**
 * Tipo para dados de um documento do Firestore
 */
export type FirestoreDocumentData<T = DocumentData> = T & {
  id: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
};

/**
 * Tipo para referência de coleção
 */
export type CollectionReference<T = DocumentData> = {
  id: string;
  path: string;
};

/**
 * Configuração do Firebase
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

/**
 * Erro do Firebase
 */
export interface FirebaseError {
  code: string;
  message: string;
  name: string;
}

