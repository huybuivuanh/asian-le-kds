import { Text, TouchableOpacity, View } from "react-native";

interface Props {
  item: OrderItem;
  onToggle: () => void;
  disabled: boolean;
}

export function OrderItemRow({ item, onToggle, disabled }: Props) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      disabled={disabled}
      className={`py-2 px-2 ${item.completed ? "opacity-40" : ""}`}
      activeOpacity={0.7}
    >
      <View className="flex-row items-start gap-2">
        {/* Circular checkbox */}
        <View
          className={`w-5 h-5 rounded-full border mt-0.5 shrink-0 items-center justify-center ${
            item.completed
              ? "bg-[#22c87a] border-[#22c87a]"
              : "border-slate-300 bg-white"
          }`}
        >
          {item.completed && (
            <Text className="text-white text-[10px] font-bold">✓</Text>
          )}
        </View>

        {/* Item content */}
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text
              className={`text-slate-900 text-xl font-bold flex-1 ${
                item.completed ? "line-through" : ""
              }`}
            >
              {item.quantity > 1 ? `${item.quantity}x ` : ""}
              {item.name}
            </Text>
          </View>

          {item.options?.length ? (
            <>
              {item.options.map((o) => (
                <Text key={o.name} className="text-lg mt-0.5">
                  * {o.quantity > 1 ? `${o.quantity}x ` : ""}
                  {o.name}
                </Text>
              ))}
            </>
          ) : null}
          {item.changes?.length ? (
            <>
              {item.changes.map((c) => (
                <Text
                  key={`${c.from}-${c.to ?? ""}`}
                  className="text-lg mt-0.5"
                >
                  * Change: {`${c.from} → ${c.to}`}
                </Text>
              ))}
            </>
          ) : null}
          {item.extras?.length ? (
            <>
              {item.extras.map((e) => (
                <Text key={e.description} className="text-lg mt-0.5">
                  {`+ Add Extra: ${e.description}`}
                </Text>
              ))}
            </>
          ) : null}
          {item.instructions && (
            <Text className="text-amber-700 text-lg italic mt-0.5">
              * {item.instructions}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}
