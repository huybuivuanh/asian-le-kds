import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { useEffect, useState } from "react";

import { DEMO_EMAIL } from "@/config/demo";
import { activateDemoDb, activateProductionDb, auth } from "./config";

export function useFirebaseUser() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u?.email === DEMO_EMAIL) {
        activateDemoDb();
      } else {
        activateProductionDb();
      }
      setUser(u);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, isLoading };
}

export async function loginWithEmailPassword(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function logout() {
  return signOut(auth);
}

