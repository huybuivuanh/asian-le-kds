import { ConnectionBanner, KDSHeader, OrderCard, QueueDivider } from "@/components/kds";
import { useKDSOrders } from "@/hooks/useKDSOrders";
import { logout } from "@/services/firebase/auth";
import { subscribeToActiveAllOrders } from "@/services/firebase/orders";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OrdersScreen() {
  const { activeOrders, completedOrders, toggleItem, completeOrder, isConnected } =
    useKDSOrders(subscribeToActiveAllOrders, "kds_completed_orders", true);

  return (
    <SafeAreaView
      className="flex-1 bg-[#0f1117]"
      edges={["top", "left", "right"]}
    >
      <KDSHeader
        title="Orders"
        onLogout={() => {
          void logout();
        }}
      />
      <ConnectionBanner visible={!isConnected} />
      <ScrollView
        horizontal
        className="flex-1"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: "stretch", paddingHorizontal: 4 }}
      >
        {activeOrders.map((o) => (
          <OrderCard
            key={o.order.id}
            kdsOrder={o}
            onToggleItem={(index) => toggleItem(o.order.id!, index)}
            onComplete={() => completeOrder(o.order.id!)}
          />
        ))}
        {completedOrders.length > 0 && <QueueDivider />}
        {completedOrders.map((o) => (
          <OrderCard
            key={o.order.id}
            kdsOrder={o}
            onToggleItem={(index) => toggleItem(o.order.id!, index)}
            onComplete={() => completeOrder(o.order.id!)}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
