import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  Auth,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import {
  initializeFirestore,
  memoryEagerGarbageCollector,
  memoryLocalCache,
} from "firebase/firestore";
import { Platform } from "react-native";

// Set values in .env.local — EXPO_PUBLIC_ prefix required for Expo bundler
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let auth: Auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

const firestoreSettings = {
  localCache: memoryLocalCache({
    garbageCollector: memoryEagerGarbageCollector(),
  }),
};

const productionDb = initializeFirestore(app, firestoreSettings);
const demoDb = initializeFirestore(app, firestoreSettings, "demo");

export const firebase = { db: productionDb };

export function activateDemoDb() {
  firebase.db = demoDb;
}
export function activateProductionDb() {
  firebase.db = productionDb;
}

export { auth };
