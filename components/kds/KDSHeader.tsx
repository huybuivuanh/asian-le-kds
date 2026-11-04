import { Image, Text, TouchableOpacity, View } from "react-native";

const LOGO = require("@/assets/logo.png");

interface Props {
  title: string;
  onLogout?: () => void;
}

export function KDSHeader({ title, onLogout }: Props) {
  return (
    <View className="bg-[#1a1d27] px-4 py-3 flex-row items-center justify-between border-b border-white/10">
      {/* Left: "ASIAN [map] LE" logo (same as the website) + app name */}
      <View className="flex-row items-center gap-3">
        <View
          className="flex-row items-center gap-0.5"
          accessibilityLabel="Asian Le"
        >
          <Text className="text-white text-[26px] leading-[26px] font-black">
            ASIAN
          </Text>
          {/* Inline style: NativeWind size classes are not applied to Image on web */}
          <Image source={LOGO} style={{ width: 13, height: 26 }} resizeMode="contain" />
          <Text className="text-white text-[26px] leading-[26px] font-black">
            LE
          </Text>
        </View>
        <Text className="text-white/80 font-semibold text-sm">
          Kitchen Display System
        </Text>
      </View>

      {/* Center: title */}
      <Text className="text-white font-bold">{title}</Text>

      {/* Right: live clock + sign out */}
      <View className="flex-row items-center gap-3">
        {!!onLogout && (
          <TouchableOpacity
            onPress={onLogout}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2"
          >
            <Text className="text-white/80 text-xs font-semibold">
              Sign out
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
