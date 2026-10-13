import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  onSnapshot,
  query,
  where,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from './firebaseAuth';

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

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || false,
      isAnonymous: auth?.currentUser?.isAnonymous || false,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

// Test connection on application startup
export async function testFirestoreConnection(): Promise<boolean> {
  if (!db) return false;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.info('Firestore connection validated successfully.');
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore is running in offline/cached mode.');
    }
    return false;
  }
}

// Collection types
export type CloudCollection = 'repostajes' | 'mantenimientos' | 'neumaticos' | 'tramites' | 'viajes';

// Save or update document in Firestore
export async function saveCloudRecord(
  userId: string,
  collectionName: CloudCollection,
  record: any
): Promise<boolean> {
  if (!userId || !record?.id) return false;
  const path = `users/${userId}/${collectionName}`;
  try {
    if (db) {
      await setDoc(doc(db, path, String(record.id)), {
        ...record,
        userId,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      return true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${path}/${record.id}`);
  }
  return false;
}

// Delete document in Firestore
export async function deleteCloudRecord(
  userId: string,
  collectionName: CloudCollection,
  recordId: string
): Promise<boolean> {
  if (!userId || !recordId) return false;
  const path = `users/${userId}/${collectionName}`;
  try {
    if (db) {
      await deleteDoc(doc(db, path, String(recordId)));
      return true;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${recordId}`);
  }
  return false;
}

// Fetch all records from Firestore collection once
export async function fetchCloudRecords(
  userId: string,
  collectionName: CloudCollection
): Promise<any[]> {
  if (!userId || !db) return [];
  const path = `users/${userId}/${collectionName}`;
  try {
    const snap = await getDocs(collection(db, path));
    const items: any[] = [];
    snap.forEach((d) => {
      items.push({ ...d.data(), id: d.id });
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

// Subscribe to real-time changes in a Firestore collection
export function subscribeToCloudCollection(
  userId: string,
  collectionName: CloudCollection,
  onData: (records: any[]) => void
): () => void {
  if (!userId || !db) {
    return () => {};
  }
  const path = `users/${userId}/${collectionName}`;
  try {
    return onSnapshot(
      collection(db, path),
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((d) => {
          items.push({ ...d.data(), id: d.id });
        });
        onData(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return () => {};
  }
}

// Save Vehicle Profile / Tank Balance in Firestore
export async function saveCloudVehicleConfig(
  userId: string,
  config: {
    fuelBalance?: number;
    fuelPricePerLiter?: number;
    odometer?: number;
    vehicleName?: string;
    country?: string;
    fuelPrices?: Record<string, number>;
    lastFuelType?: string;
    lastRefuelFuel?: string;
  }
): Promise<boolean> {
  if (!userId || !db) return false;
  const path = `users/${userId}/config/vehicle`;
  try {
    await setDoc(doc(db, 'users', userId, 'config', 'vehicle'), {
      ...config,
      userId,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}

// Read Vehicle Profile / Tank Balance from Firestore
export async function getCloudVehicleConfig(userId: string): Promise<any | null> {
  if (!userId || !db) return null;
  const path = `users/${userId}/config/vehicle`;
  try {
    const snap = await getDoc(doc(db, 'users', userId, 'config', 'vehicle'));
    if (snap.exists()) {
      return snap.data();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
  return null;
}
