import { KDSOrder } from "@/hooks/useKDSOrders";
import {
  compareByKitchenTypeThenName,
  dineInItemSortTier,
} from "@/utils/orderItemSections";
import { useEffect, useRef } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { OrderItemRow } from "./OrderItemRow";

interface Props {
  kdsOrder: KDSOrder;
  onToggleItem: (index: number) => void;
  onComplete: () => void;
  disableItemToggle?: boolean;
}

export function OrderCard({
  kdsOrder,
  onToggleItem,
  onComplete,
  disableItemToggle = false,
}: Props) {
  const { order, items } = kdsOrder;
  const isCompleted = items.length > 0 && items.every((i) => i.completed);

  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  });
  useEffect(() => {
    if (isCompleted) onCompleteRef.current();
  }, [isCompleted]);

  return (
    <View
      className={`w-[300px] mx-1.5 my-2 rounded-xl border border-white/10 overflow-hidden flex-col bg-white ${isCompleted ? "opacity-60" : ""}`}
      style={{ flexShrink: 0, alignSelf: "stretch" }}
    >
      {/* Card header */}
      <View className="px-3 pt-3 pb-2">
        {/* Centered table label */}
        <View className="items-center mb-2">
          <Text className="text-slate-900 font-bold text-3xl">
            Table {order.tableNumber}
          </Text>
        </View>

        {/* Detail rows */}
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-slate-900 text-sm font-bold">
            Guests: {order.guests}
          </Text>
          <Text className="text-slate-900 text-sm font-bold tabular-nums">
            {order.createdAt.toDate().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-slate-900 text-sm font-bold" numberOfLines={1}>
            Staff: {order.staff}
          </Text>
        </View>
      </View>

      <View className="h-px bg-slate-500 mx-3" />

      {/* Items list */}
      <ScrollView
        className="flex-1"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
      >
        {(() => {
          const SECTION_TITLES: Record<number, string> = {
            0: "Appetizers",
            1: "For Table",
            2: "To Go",
          };

          const sorted = items
            .map((item, index) => ({ item, index }))
            .sort((a, b) => {
              const ta = dineInItemSortTier(a.item);
              const tb = dineInItemSortTier(b.item);
              if (ta !== tb) return ta - tb;
              return compareByKitchenTypeThenName(a.item, b.item);
            });

          const byTier = new Map<
            number,
            Array<{ item: (typeof items)[number]; index: number }>
          >([
            [0, []],
            [1, []],
            [2, []],
          ]);

          for (const entry of sorted) {
            const tier = dineInItemSortTier(entry.item);
            byTier.get(tier)?.push(entry);
          }

          const tierBadgeClass = (tier: number) => {
            switch (tier) {
              case 0:
                return "bg-amber-500";
              case 2:
                return "bg-teal-600";
              default:
                return "bg-slate-600";
            }
          };

          return ([0, 1, 2] as const)
            .filter((tier) => (byTier.get(tier)?.length ?? 0) > 0)
            .map((tier) => (
              <View key={tier} className="pt-2">
                <View className="px-2 pb-1">
                  <View
                    className={`self-start rounded-full px-3 py-1 ${tierBadgeClass(tier)}`}
                  >
                    <Text className="text-xs font-semibold text-white">
                      {SECTION_TITLES[tier]}
                    </Text>
                  </View>
                </View>

                {byTier.get(tier)!.map(({ item, index }) => (
                  <OrderItemRow
                    key={item.id ?? `${tier}-${index}-${item.name}`}
                    item={item}
                    onToggle={() => onToggleItem(index)}
                    disabled={disableItemToggle}
                  />
                ))}
              </View>
            ));
        })()}
      </ScrollView>

      <View className="h-px bg-slate-200 mx-3" />

      {/* Footer */}
      <View className="px-3 py-2">
        {!isCompleted && (
          <TouchableOpacity
            onPress={onComplete}
            className="rounded-lg py-4 items-center bg-brand"
            activeOpacity={0.8}
          >
            <Text className="text-xs font-semibold text-white">
              Complete order
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
