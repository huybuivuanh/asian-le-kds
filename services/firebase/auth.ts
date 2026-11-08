import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from "firebase/auth";
import { useEffect, useState } from "react";

import { checkAccessAndSetBusiness } from "./business";
import { auth } from "./config";

/**
 * The signed-in user, only once their claims allow the KDS and their business is set.
 * A remembered login without KDS access is signed out.
 */
export function useFirebaseUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // The access check is async; only the latest auth event counts.
    let latest = 0;
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      const run = ++latest;
      if (!u) {
        setUser(null);
        setIsLoading(false);
        return;
      }
      const access = await checkAccessAndSetBusiness(u);
      if (run !== latest) return;
      if (!access.ok) {
        await signOut(auth); // fires again with null
        return;
      }
      setUser(u);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  return { user, isLoading };
}

/** Signs in, then refuses (and signs out) accounts without KDS access. */
export async function loginWithEmailPassword(email: string, password: string) {
  const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
  const access = await checkAccessAndSetBusiness(user);
  if (!access.ok) {
    await signOut(auth);
    throw new Error(access.message);
  }
}

export async function logout() {
  return signOut(auth);
}
