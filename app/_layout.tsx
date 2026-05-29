import { Stack } from "expo-router";
import "react-native-reanimated";
import "../global.css";

import { Redirect, useSegments } from "expo-router";
import { useFirebaseUser } from "@/services/firebase/auth";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Updates from "expo-updates";
import { useKeepAwake } from "expo-keep-awake";
import { useEffect, useRef } from "react";
import { ActivityIndicator, AppState, type AppStateStatus, View } from "react-native";
import { BRAND } from "@/constants/colors";

const RELOAD_AFTER_MS = 5 * 60 * 1000;

export default function RootLayout() {
  const { user, isLoading } = useFirebaseUser();
  const backgroundedAt = useRef<number | null>(null);
  useKeepAwake();

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state: AppStateStatus) => {
      if (state === "background") {
        backgroundedAt.current = Date.now();
      } else if (state === "active" && backgroundedAt.current !== null) {
        if (Date.now() - backgroundedAt.current >= RELOAD_AFTER_MS) {
          if (!__DEV__) void Updates.reloadAsync();
        }
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, []);
  const segments = useSegments();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0f1117", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={BRAND} size="large" />
      </View>
    );
  }

  const isAuthRoute = segments[0] === "login";

  if (!user && !isAuthRoute) {
    return <Redirect href="/login" />;
  }

  if (user && isAuthRoute) {
    return <Redirect href="/" />;
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
      </Stack>
    </SafeAreaProvider>
  );
}
