import { Text, View } from "react-native";
import { cx } from "./lib/cx";

interface CellBadgeProps {
  /** 격자 라벨 (예: "A-14") */
  label: string;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap CellBadge" (node 13404:700) — 지도 격자 라벨 배지.
 * 사용례: ver 6 `badge-격자코드`(node 14851:847).
 * ui-web `cell-badge.tsx`의 RN 미러 — props(label·className)와 클래스 문법을 동일하게 맞춘다.
 * RN은 인라인 요소가 없어 span 대신 View + Text 2단으로 같은 시각을 만든다.
 *
 * @example
 * <CellBadge label="A-14" />
 */
export const CellBadge = ({ label, className }: CellBadgeProps) => (
  <View
    className={cx(
      "self-start items-center justify-center rounded-sm bg-primary px-sm py-1.25 shadow-raised",
      className,
    )}
  >
    <Text className="text-fm-body-strong text-primary-foreground">{label}</Text>
  </View>
);
