import { KDSOrder } from "@/hooks/useKDSOrders";
import {
  DineInOrder,
  OrderType,
  TakeOutFulfillment,
  TakeOutOrder,
} from "@/types/types";
import { formatPhone, takeoutFulfillmentIsScheduled } from "@/utils/helper";
import {
  dineInItemSortTier,
  kitchenTypeSortRank,
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

function cardBgClass(order: DineInOrder | TakeOutOrder): string {
  if (order.orderType === OrderType.DineIn) return "bg-white";
  if (takeoutFulfillmentIsScheduled(order as TakeOutOrder))
    return "bg-orange-100 border-orange-200";
  return "bg-blue-100 border-blue-200";
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
      className={`w-[300px] mx-1.5 my-2 rounded-xl border border-white/10 overflow-hidden flex-col ${cardBgClass(order)} ${isCompleted ? "opacity-60" : ""}`}
      style={{ flexShrink: 0, alignSelf: "stretch" }}
    >
      {/* Card header */}
      <View className="px-3 pt-3 pb-2">
        {/* Centered order type label */}
        <View className="items-center mb-2">
          {order.orderType === OrderType.DineIn ? (
            <Text className="text-slate-900 font-bold text-3xl">
              Table {(order as DineInOrder).tableNumber}
            </Text>
          ) : takeoutFulfillmentIsScheduled(order as TakeOutOrder) ? (
            <>
              <Text className="text-orange-600 font-bold text-3xl tracking-wide">
                Pre-Order
              </Text>
              <Text className="text-orange-700 text-sm font-semibold mt-0.5">
                {(
                  (order as TakeOutOrder).fulfillment as Extract<
                    TakeOutFulfillment,
                    { kind: "scheduled" }
                  >
                ).scheduledAt
                  .toDate()
                  .toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
              </Text>
            </>
          ) : (
            <Text className="text-blue-600 font-bold text-3xl tracking-wide">
              Take Out
            </Text>
          )}
        </View>

        {/* Detail rows */}
        {order.orderType === OrderType.DineIn ? (
          <>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-slate-900 text-sm font-bold">
                Guests: {(order as DineInOrder).guests}{" "}
              </Text>
              <View className="flex-row items-center gap-2">
                <Text className="text-slate-900 text-sm font-bold tabular-nums">
                  {order.createdAt.toDate().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between mt-1">
              <Text
                className="text-slate-900 text-sm font-bold"
                numberOfLines={1}
              >
                Staff: {order.staff}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View className="flex-row items-center justify-between">
              {(order as TakeOutOrder).customerName ? (
                <Text
                  className="text-slate-900 text-sm font-bold"
                  numberOfLines={1}
                >
                  {(order as TakeOutOrder).customerName}
                </Text>
              ) : (
                <View />
              )}
              {(order as TakeOutOrder).phoneNumber ? (
                <Text className="text-slate-900 text-sm font-bold tabular-nums">
                  {order.phoneNumber ? formatPhone(order.phoneNumber) : ""}
                </Text>
              ) : null}
            </View>
            <View className="flex-row items-center justify-between mt-1">
              <Text
                className="text-slate-900 text-sm font-bold"
                numberOfLines={1}
              >
                Staff: {order.staff}
              </Text>
              <View className="flex-row items-center gap-2">
                {isCompleted && (
                  <Text className="text-slate-900 text-sm font-bold">Done</Text>
                )}
                <Text className="text-slate-900 text-sm font-bold tabular-nums">
                  {order.createdAt.toDate().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
            </View>
          </>
        )}
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
              const ra = kitchenTypeSortRank(a.item.kitchenType);
              const rb = kitchenTypeSortRank(b.item.kitchenType);
              if (ra !== rb) return ra - rb;
              return a.index - b.index;
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
