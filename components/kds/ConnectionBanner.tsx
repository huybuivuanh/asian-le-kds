import { Ionicons } from "@expo/vector-icons";
import { Modal, Text, View } from "react-native";

interface Props {
  visible: boolean;
}

export function ConnectionBanner({ visible }: Props) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/50 items-center justify-center">
        <View className="bg-white rounded-2xl mx-10 px-8 py-8 items-center shadow-lg w-80">
          <Ionicons name="wifi-outline" size={52} color="#ef4444" />
          <Text className="text-slate-900 font-bold text-xl mt-4 text-center">
            No Internet Connection
          </Text>
          <Text className="text-slate-500 text-sm mt-2 text-center leading-5">
            Check your connection. The app will resume automatically when restored.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
