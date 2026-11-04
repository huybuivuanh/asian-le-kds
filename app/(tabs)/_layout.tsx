import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { BRAND } from "@/constants/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#1a1d27",
          borderTopColor: "rgba(255,255,255,0.1)",
        },
        tabBarActiveTintColor: BRAND,
        tabBarInactiveTintColor: "rgba(255,255,255,0.4)",
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dine In",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "restaurant" : "restaurant-outline"}
              size={size}
              color={color as string}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "receipt" : "receipt-outline"}
              size={size}
              color={color as string}
            />
          ),
        }}
      />
    </Tabs>
  );
}
