import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase SDK
export const app = initializeApp(firebaseConfig);

// Initialize Firestore with robust multi-tab persistent cache and auto-detecting transport
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);

export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot as mandated by the Firebase skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    // Only attempt server fetch if online, and race with a 4s timeout to avoid noisy 10s warnings
    if (!navigator.onLine) {
      return false;
    }
    const testPromise = getDocFromServer(doc(db, 'test', 'connection'));
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 4000)
    );
    await Promise.race([testPromise, timeoutPromise]);
    return true;
  } catch (error) {
    // Silent fallback to local persistence
    return false;
  }
}

// Auth helpers
export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function loginWithEmail(email: string, pass: string) {
  return signInWithEmailAndPassword(auth, email, pass);
}

export async function registerWithEmail(email: string, pass: string) {
  return createUserWithEmailAndPassword(auth, email, pass);
}

export async function logoutUser() {
  return signOut(auth);
}

export { onAuthStateChanged };
export type { User };
