import { Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { cx } from "./lib/cx";

interface BottomSheetProps {
  title?: string;
  /** 타이틀 우측 액션 텍스트 (예: "전체 보기") */
  actionLabel?: string;
  onAction?: () => void;
  /** 드래그 핸들 표시 여부 (기본 true) */
  handle?: boolean;
  /** 콘텐츠 슬롯 */
  children?: ReactNode;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap BottomSheet" (node 13406:687) — 바텀시트 쉘.
 * 프레젠테이셔널 쉘 — 드래그/스냅 동작은 사용하는 쪽에서 감싼다.
 *
 * @example
 * <BottomSheet title="이 지역 격자 24개 · 영상 138개" actionLabel="전체 보기" onAction={openList}>
 *   <VideoRow ... />
 * </BottomSheet>
 */
export const BottomSheet = ({
  title,
  actionLabel,
  onAction,
  handle = true,
  children,
  className,
}: BottomSheetProps) => (
  <View
    className={cx(
      "w-full gap-sm rounded-t-xl bg-surface-elevated px-md pb-md shadow-sheet",
      handle ? "pt-2.5" : "pt-md",
      className,
    )}
  >
    {handle && (
      <View className="items-center">
        <View className="h-1 w-9 rounded-full bg-hairline-strong" />
      </View>
    )}
    {(title || actionLabel) && (
      <View className="flex-row items-center gap-xs">
        <Text
          numberOfLines={1}
          className="flex-1 text-fm-title text-foreground"
        >
          {title}
        </Text>
        {actionLabel && (
          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            className="active:opacity-60"
          >
            <Text className="text-fm-label text-primary">{actionLabel}</Text>
          </Pressable>
        )}
      </View>
    )}
    {children}
  </View>
);
