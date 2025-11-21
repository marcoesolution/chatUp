// Exportações principais do Firebase
export { app, auth, db, storage, analytics } from './config';
export type {
  FirebaseApp,
  Auth,
  Firestore,
  FirebaseStorage,
  Analytics,
} from './config';

// Exportações de tipos
export type {
  FirebaseUser,
  FirestoreDocument,
  FirestoreDocumentData,
  CollectionReference,
  FirebaseConfig,
  FirebaseError,
} from './types';

