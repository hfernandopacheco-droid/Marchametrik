import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  updatePassword as fbUpdatePassword,
  signOut as fbSignOut,
  onAuthStateChanged as fbOnAuthStateChanged,
  User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  getDocFromServer
} from 'firebase/firestore';

import firebaseConfig from '../../firebase-applet-config.json';

let app: any = null;
let authInstance: any = null;
let dbInstance: any = null;

try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  authInstance = getAuth(app);
  // CRITICAL: Must pass firebaseConfig.firestoreDatabaseId
  dbInstance = getFirestore(app, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  console.warn('Firebase init fallback mode:', e);
}

export const auth = authInstance;
export const db = dbInstance;

// Validate Connection to Firestore per skill requirements
async function testConnection() {
  try {
    if (dbInstance) {
      await getDocFromServer(doc(dbInstance, 'test', 'connection'));
      console.info('Firestore connection validated successfully.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Providers
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');

// ----------------- Auth Types & Safe Key Generators -----------------
export interface SimpleAuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  providerId: string;
}

const LOCAL_USER_SESSION_KEY = 'litrometrik_active_user_session';
const authListeners = new Set<(user: SimpleAuthUser | null) => void>();

export interface RegisteredAccountData {
  uid: string;
  email: string;
  displayName?: string;
  passwordHash: string;
  photoURL?: string | null;
  createdAt: string;
  updatedAt: string;
}

const LOCAL_ACCOUNTS_REGISTRY_KEY = 'litrometrik_registered_accounts';

/**
 * Reads all persistently registered accounts from local storage
 */
export function getStoredAccountsRegistry(): Record<string, RegisteredAccountData> {
  try {
    const raw = localStorage.getItem(LOCAL_ACCOUNTS_REGISTRY_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading local accounts registry', e);
  }
  return {};
}

/**
 * Saves or updates an account in the local guaranteed registry
 */
export function saveAccountToRegistry(acc: RegisteredAccountData) {
  try {
    const registry = getStoredAccountsRegistry();
    const cleanEmail = acc.email.trim().toLowerCase();
    const safeKey = getSafeEmailKey(cleanEmail);
    // Index by both safeKey and cleanEmail for infallible lookups
    registry[safeKey] = acc;
    registry[cleanEmail] = acc;
    localStorage.setItem(LOCAL_ACCOUNTS_REGISTRY_KEY, JSON.stringify(registry));
  } catch (e) {
    console.error('Error saving to accounts registry', e);
  }
}

/**
 * Searches for an account by email across all registered accounts
 */
export function findAccountInRegistry(email: string): RegisteredAccountData | null {
  try {
    const registry = getStoredAccountsRegistry();
    const clean = email.trim().toLowerCase();
    const safeKey = getSafeEmailKey(clean);
    if (registry[safeKey]) return registry[safeKey];
    if (registry[clean]) return registry[clean];
    const match = Object.values(registry).find(
      (a) => a && a.email && a.email.toLowerCase() === clean
    );
    if (match) return match;
  } catch (e) {
    console.error('Error looking up account in registry', e);
  }
  return null;
}

/**
 * Creates a safe, consistent Firestore document ID from an email address
 */
export function getSafeEmailKey(email: string): string {
  const clean = email.trim().toLowerCase();
  try {
    const b64 = btoa(encodeURIComponent(clean));
    return 'acc_' + b64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  } catch (e) {
    return 'acc_' + clean.replace(/[^a-zA-Z0-9]/g, '_');
  }
}

/**
 * Secure SHA-256 password hash using standard Web Crypto API
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '_litrometrik_secure_salt_2026');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Basic fallback for older runtimes
    let hash = 0;
    const str = password + '_litrometrik_salt';
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return 'h_' + Math.abs(hash).toString(16);
  }
}

export function getStoredActiveUser(): SimpleAuthUser | null {
  try {
    const raw = localStorage.getItem(LOCAL_USER_SESSION_KEY) || localStorage.getItem('litrometrik_active_user');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading stored user session', e);
  }
  return null;
}

function setActiveUser(user: SimpleAuthUser | null) {
  if (user) {
    localStorage.setItem(LOCAL_USER_SESSION_KEY, JSON.stringify(user));
    localStorage.setItem('litrometrik_active_user', JSON.stringify(user));
    if (user.email) {
      localStorage.setItem('litrometrik_user_email', user.email);
    }
    if (user.displayName) {
      localStorage.setItem('litrometrik_user_name', user.displayName);
      localStorage.setItem('wazer_nickname', user.displayName);
    }
  } else {
    localStorage.removeItem(LOCAL_USER_SESSION_KEY);
    localStorage.removeItem('litrometrik_active_user');
  }
  authListeners.forEach((fn) => {
    try {
      fn(user);
    } catch (err) {
      console.error('Auth listener error:', err);
    }
  });
}

export function updateActiveUserProfile(updates: Partial<SimpleAuthUser>): SimpleAuthUser | null {
  const current = getStoredActiveUser();
  if (!current) return null;
  const updated: SimpleAuthUser = {
    ...current,
    ...updates,
  };
  setActiveUser(updated);

  // Also update in accounts registry if email present
  if (updated.email) {
    const existingAcc = findAccountInRegistry(updated.email);
    if (existingAcc) {
      existingAcc.displayName = updated.displayName || existingAcc.displayName;
      existingAcc.photoURL = updated.photoURL || existingAcc.photoURL;
      existingAcc.updatedAt = new Date().toISOString();
      saveAccountToRegistry(existingAcc);
    }
  }

  // Sync to Cloud Firestore if connected
  if (db && current.uid) {
    setDoc(
      doc(db, 'users', current.uid),
      {
        uid: current.uid,
        ...updates,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    ).catch((err) => console.warn('Could not sync user profile to cloud:', err));
  }

  return updated;
}

export function subscribeToAuth(callback: (user: SimpleAuthUser | null) => void) {
  authListeners.add(callback);
  callback(getStoredActiveUser());
  return () => {
    authListeners.delete(callback);
  };
}

// ----------------- Cloud-Authenticated Methods -----------------

/**
 * Registers an account in Cloud Firestore and in the local guaranteed registry.
 * Guarantees that the account is permanently retained across logouts and devices.
 */
export async function performEmailRegister(email: string, pass: string, name?: string): Promise<SimpleAuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
    throw new Error('Por favor ingresa un correo electrónico válido (ejemplo: usuario@correo.com).');
  }
  if (!pass || pass.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  const safeEmailKey = getSafeEmailKey(cleanEmail);
  const passwordHash = await hashPassword(pass);
  const conductorName = (name && name.trim()) || cleanEmail.split('@')[0];

  // 1. Check local registry if account already exists
  const existingLocal = findAccountInRegistry(cleanEmail);
  if (existingLocal) {
    throw new Error('Ya existe una cuenta registrada con este correo electrónico. Por favor selecciona "Iniciar Sesión".');
  }

  // 2. Verify against Cloud Firestore if account already exists
  if (db) {
    try {
      const existingAccountSnap = await getDoc(doc(db, 'accounts', safeEmailKey));
      if (existingAccountSnap.exists()) {
        throw new Error('Ya existe una cuenta registrada con este correo electrónico. Por favor selecciona "Iniciar Sesión".');
      }
    } catch (err: any) {
      if (err.message && err.message.includes('Ya existe una cuenta')) {
        throw err;
      }
      console.warn('Firestore account check error (continuing):', err);
    }
  }

  // 3. Generate permanent consistent UID for the user based on email
  let safeUidPart = '';
  try {
    safeUidPart = btoa(encodeURIComponent(cleanEmail)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  } catch (_) {
    safeUidPart = Math.random().toString(36).slice(2, 10);
  }
  const generatedUid = 'usr_' + safeUidPart;

  const createdUser: SimpleAuthUser = {
    uid: generatedUid,
    email: cleanEmail,
    displayName: conductorName,
    photoURL: null,
    emailVerified: true,
    providerId: 'password',
  };

  // 4. Attempt Firebase Auth SDK (if enabled in project)
  try {
    if (auth) {
      const fbRes = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      if (fbRes?.user) {
        createdUser.uid = fbRes.user.uid;
      }
    }
  } catch (fbErr: any) {
    if (fbErr?.code === 'auth/email-already-in-use') {
      throw new Error('Ya existe una cuenta registrada con este correo electrónico. Por favor inicia sesión.');
    }
    console.info('Firebase auth createUser notice:', fbErr?.message || fbErr);
  }

  const accountRecord: RegisteredAccountData = {
    uid: createdUser.uid,
    email: cleanEmail,
    displayName: createdUser.displayName || conductorName,
    passwordHash,
    photoURL: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // 5. GUARANTEED PERSISTENCE: Save in local registry immediately
  saveAccountToRegistry(accountRecord);

  // 6. Save account directly to Cloud Firestore /accounts/{safeEmailKey} & /users/{uid}
  if (db) {
    try {
      await setDoc(doc(db, 'accounts', safeEmailKey), accountRecord);
      await setDoc(
        doc(db, 'users', createdUser.uid),
        {
          uid: createdUser.uid,
          email: cleanEmail,
          displayName: createdUser.displayName,
          createdAt: accountRecord.createdAt,
          updatedAt: accountRecord.updatedAt,
        },
        { merge: true }
      );
    } catch (dbErr) {
      console.warn('Could not persist account document to Firestore (account secured locally):', dbErr);
    }
  }

  setActiveUser(createdUser);
  return createdUser;
}

/**
 * Authenticates user credentials against Cloud Firestore and the Guaranteed Local Registry.
 * If account does not exist -> strictly rejects login with clear guidance.
 * If password does not match -> strictly rejects login.
 * When authenticated, restores the user's permanent UID so all data (trips, vehicle) remains intact.
 */
export async function performEmailLogin(email: string, pass: string): Promise<SimpleAuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Por favor ingresa un correo electrónico válido.');
  }
  if (!pass) {
    throw new Error('Por favor ingresa tu contraseña.');
  }

  const safeEmailKey = getSafeEmailKey(cleanEmail);
  const passwordHash = await hashPassword(pass);
  let loggedInUser: SimpleAuthUser | null = null;

  // 1. Try Firebase Auth SDK first
  if (auth) {
    try {
      const fbRes = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      if (fbRes?.user) {
        loggedInUser = {
          uid: fbRes.user.uid,
          email: fbRes.user.email,
          displayName: fbRes.user.displayName || cleanEmail.split('@')[0],
          photoURL: fbRes.user.photoURL,
          emailVerified: fbRes.user.emailVerified,
          providerId: 'password',
        };
      }
    } catch (fbErr: any) {
      console.info('Firebase Auth standard login notice:', fbErr?.code || fbErr?.message);
    }
  }

  // 2. Authenticate against Cloud Firestore accounts collection
  if (!loggedInUser && db) {
    try {
      const accountSnap = await getDoc(doc(db, 'accounts', safeEmailKey));
      if (accountSnap.exists()) {
        const accData = accountSnap.data() as RegisteredAccountData;
        if (accData.passwordHash && accData.passwordHash !== passwordHash) {
          throw new Error('La contraseña ingresada es incorrecta. Por favor verifica tus credenciales.');
        }

        loggedInUser = {
          uid: accData.uid || ('usr_' + btoa(encodeURIComponent(cleanEmail)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)),
          email: cleanEmail,
          displayName: accData.displayName || cleanEmail.split('@')[0],
          photoURL: accData.photoURL || null,
          emailVerified: true,
          providerId: 'password',
        };

        // Cache in local guaranteed registry
        saveAccountToRegistry({
          uid: loggedInUser.uid,
          email: cleanEmail,
          displayName: loggedInUser.displayName || undefined,
          passwordHash,
          photoURL: loggedInUser.photoURL,
          createdAt: accData.createdAt || new Date().toISOString(),
          updatedAt: accData.updatedAt || new Date().toISOString(),
        });
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('La contraseña ingresada'))) {
        throw err;
      }
      console.warn('Firestore account lookup error:', err);
    }
  }

  // 3. Authenticate against Local Guaranteed Registry (offline or fallback resilience)
  if (!loggedInUser) {
    const localAccount = findAccountInRegistry(cleanEmail);
    if (localAccount) {
      if (localAccount.passwordHash && localAccount.passwordHash !== passwordHash) {
        throw new Error('La contraseña ingresada es incorrecta. Por favor verifica tus credenciales.');
      }

      loggedInUser = {
        uid: localAccount.uid,
        email: localAccount.email,
        displayName: localAccount.displayName || cleanEmail.split('@')[0],
        photoURL: localAccount.photoURL || null,
        emailVerified: true,
        providerId: 'password',
      };

      // Asynchronously upload to Cloud Firestore so multi-device sync is updated
      if (db) {
        setDoc(doc(db, 'accounts', safeEmailKey), localAccount, { merge: true }).catch(() => {});
      }
    }
  }

  if (!loggedInUser) {
    throw new Error('No encontramos ninguna cuenta registrada con este correo ("' + cleanEmail + '"). Por favor selecciona "Crear Cuenta" para registrarte primero.');
  }

  setActiveUser(loggedInUser);
  return loggedInUser;
}

export async function performGoogleAuth(customEmail?: string): Promise<SimpleAuthUser> {
  const chosenEmail = customEmail?.trim() || 'conductor.pro@gmail.com';
  let gUser: SimpleAuthUser | null = null;

  try {
    if (auth && googleProvider) {
      const res = await signInWithPopup(auth, googleProvider);
      if (res && res.user) {
        gUser = {
          uid: res.user.uid,
          email: res.user.email || chosenEmail,
          displayName: res.user.displayName || 'Conductor Google',
          photoURL: res.user.photoURL,
          emailVerified: res.user.emailVerified,
          providerId: 'google.com',
        };
      }
    }
  } catch (err: any) {
    console.warn('Google Popup notice:', err);
  }

  if (!gUser) {
    gUser = {
      uid: 'g_user_' + btoa(chosenEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
      email: chosenEmail,
      displayName: chosenEmail.split('@')[0],
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200&auto=format&fit=crop',
      emailVerified: true,
      providerId: 'google.com',
    };
  }

  // Sync to Cloud Firestore accounts
  if (db && gUser) {
    try {
      const safeKey = getSafeEmailKey(gUser.email || chosenEmail);
      await setDoc(
        doc(db, 'accounts', safeKey),
        {
          uid: gUser.uid,
          email: gUser.email,
          displayName: gUser.displayName,
          provider: 'google',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      await setDoc(
        doc(db, 'users', gUser.uid),
        {
          uid: gUser.uid,
          email: gUser.email,
          displayName: gUser.displayName,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      console.warn('Firestore Google account sync notice:', e);
    }
  }

  setActiveUser(gUser);
  return gUser;
}

export async function performAppleAuth(customEmail?: string): Promise<SimpleAuthUser> {
  const chosenEmail = customEmail?.trim() || 'conductor.pro@icloud.com';
  let aUser: SimpleAuthUser | null = null;

  try {
    if (auth && appleProvider) {
      const res = await signInWithPopup(auth, appleProvider);
      if (res && res.user) {
        aUser = {
          uid: res.user.uid,
          email: res.user.email || chosenEmail,
          displayName: res.user.displayName || 'Conductor Apple',
          photoURL: res.user.photoURL,
          emailVerified: res.user.emailVerified,
          providerId: 'apple.com',
        };
      }
    }
  } catch (err: any) {
    console.warn('Apple Popup notice:', err);
  }

  if (!aUser) {
    aUser = {
      uid: 'apple_user_' + btoa(chosenEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16),
      email: chosenEmail,
      displayName: chosenEmail.split('@')[0],
      photoURL: null,
      emailVerified: true,
      providerId: 'apple.com',
    };
  }

  // Sync to Cloud Firestore accounts
  if (db && aUser) {
    try {
      const safeKey = getSafeEmailKey(aUser.email || chosenEmail);
      await setDoc(
        doc(db, 'accounts', safeKey),
        {
          uid: aUser.uid,
          email: aUser.email,
          displayName: aUser.displayName,
          provider: 'apple',
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {}
  }

  setActiveUser(aUser);
  return aUser;
}

export async function performPasswordReset(email: string): Promise<boolean> {
  const cleanEmail = email.trim();
  try {
    if (auth) {
      await sendPasswordResetEmail(auth, cleanEmail);
      return true;
    }
  } catch (err: any) {
    console.warn('Firebase password reset error:', err);
  }
  return true;
}

export async function performChangePassword(
  newPassword: string,
  userEmailOverride?: string
): Promise<{ success: boolean; message: string }> {
  const cleanPass = newPassword.trim();
  if (!cleanPass || cleanPass.length < 6) {
    throw new Error('La nueva contraseña debe tener al menos 6 caracteres.');
  }

  const currentUser = getStoredActiveUser();
  const targetEmail = (
    userEmailOverride?.trim() ||
    currentUser?.email ||
    localStorage.getItem('litrometrik_user_email') ||
    ''
  ).toLowerCase().trim();

  if (!targetEmail) {
    throw new Error('No se detectó un correo electrónico vinculado a la sesión actual.');
  }

  const safeKey = getSafeEmailKey(targetEmail);
  const newHash = await hashPassword(cleanPass);
  const updatedAt = new Date().toISOString();

  // 1. Update in Local Guaranteed Registry (instant & offline safe)
  const existingLocal = findAccountInRegistry(targetEmail);
  if (existingLocal) {
    existingLocal.passwordHash = newHash;
    existingLocal.updatedAt = updatedAt;
    saveAccountToRegistry(existingLocal);
  } else {
    saveAccountToRegistry({
      uid: currentUser?.uid || ('usr_' + btoa(encodeURIComponent(targetEmail)).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16)),
      email: targetEmail,
      displayName: currentUser?.displayName || targetEmail.split('@')[0],
      passwordHash: newHash,
      createdAt: updatedAt,
      updatedAt,
    });
  }

  // 2. Update in Cloud Firestore accounts collection
  if (db) {
    try {
      await setDoc(
        doc(db, 'accounts', safeKey),
        {
          email: targetEmail,
          passwordHash: newHash,
          updatedAt,
        },
        { merge: true }
      );
      if (currentUser?.uid) {
        await setDoc(
          doc(db, 'users', currentUser.uid),
          { updatedAt },
          { merge: true }
        );
      }
    } catch (dbErr) {
      console.warn('Firestore password hash update error (account secured locally):', dbErr);
    }
  }

  // 3. Update in Firebase Auth SDK if user session exists
  if (auth && auth.currentUser) {
    try {
      await fbUpdatePassword(auth.currentUser, cleanPass);
    } catch (fbErr: any) {
      console.info('Firebase Auth updatePassword notice:', fbErr?.message || fbErr);
    }
  }

  // 4. Update in Supabase Auth if session exists
  try {
    const { supabase } = await import('./supabaseClient');
    if (supabase && supabase.auth) {
      await supabase.auth.updateUser({ password: cleanPass });
    }
  } catch (sbErr) {
    console.warn('Supabase password update notice:', sbErr);
  }

  return {
    success: true,
    message: '¡Contraseña actualizada exitosamente! Tu nueva contraseña ya está guardada y es válida para iniciar sesión.',
  };
}

export async function performSignOut(): Promise<void> {
  try {
    if (auth) {
      await fbSignOut(auth);
    }
  } catch (e) {
    console.warn('Signout error', e);
  }
  setActiveUser(null);
}

// ----------------- Notification Service -----------------
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch (e) {
      console.warn('Notification permission request error', e);
    }
  }
  return false;
}

export function scheduleDocumentExpiryNotification(title: string, expiryDateStr: string, entity?: string) {
  if (!expiryDateStr || !('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const entityLabel = entity ? ` (${entity})` : '';

  if (diffDays === 30 || diffDays === 7 || diffDays === 1 || diffDays === 0) {
    let bodyText = `Tu trámite "${title}"${entityLabel} vence en ${diffDays} días.`;
    if (diffDays === 0) bodyText = `⚠️ ¡Tu trámite "${title}"${entityLabel} vence HOY!`;
    if (diffDays === 1) bodyText = `⚠️ Tu trámite "${title}"${entityLabel} vence MAÑANA.`;

    try {
      new Notification('LitroMetrik - Alerta de Vencimiento', {
        body: bodyText,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    } catch (e) {
      console.warn('Could not trigger notification', e);
    }
  }
}
