export { queryClient } from "./queryClient";
export { useRefreshOnFocus } from "./hooks/useRefreshOnFocus";

// Firebase exports
export { app, auth, db, storage, analytics } from "./firebase";
export type {
	FirebaseUser,
	FirestoreDocument,
	FirestoreDocumentData,
	CollectionReference,
	FirebaseConfig,
	FirebaseError,
	Analytics,
} from "./firebase";
