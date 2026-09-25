import type { ReactNode } from "react";
import { Text, View } from "react-native";

/**
 * SOURCE: Figma "제안 — 프로필/설정 리디자인" (node 16182:359, 2026-09-25) — 설정 그룹 카드.
 * 회색 바탕(`bg-surface`) 위 흰 카드에 행을 묶고, 제목은 카드 밖 작은 캡션이다(iOS 그룹 리스트 문법).
 * 행 사이 구분선은 아이콘 폭만큼 들여 긋는다 — 행 컴포넌트(`setting-rows.tsx`)가 `divider`로 그린다.
 */
export const SettingGroup = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <View className="gap-xs">
    <Text className="px-sm text-fm-caption font-semibold text-foreground-muted">
      {title}
    </Text>
    <View className="overflow-hidden rounded-xl bg-white shadow-raised">
      {children}
    </View>
  </View>
);
