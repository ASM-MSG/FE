import { Pressable, Text, View } from "react-native";
import { Play } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";

interface VideoPreviewProps {
  /** 대표 영상 길이 mm:ss — null이면 빈 상태 변형 (AC 4·10) */
  durationLabel: string | null;
}

/**
 * 대표 영상 미리보기 (AC 4) — Figma 14094:4200: 16:9 다크 박스 + 중앙 primary
 * 원형 재생 버튼(48px) + 우하단 길이 뱃지. 재생 실동작은 제외 범위 — 탭 스텁 (AC 4).
 * 영상 0개 격자는 같은 자리에 빈 상태를 표시한다 (AC 10, Figma 오탐 방지 2:
 * mock에 썸네일 이미지가 없어 다크 박스는 실영상 자리 폴백).
 */
export const VideoPreview = ({ durationLabel }: VideoPreviewProps) => {
  if (durationLabel === null) {
    return (
      <View className="aspect-video w-full items-center justify-center rounded-lg bg-surface">
        <Text className="text-fm-body text-foreground-muted">
          아직 업로드된 영상이 없어요
        </Text>
      </View>
    );
  }
  return (
    <View className="aspect-video w-full overflow-hidden rounded-lg bg-foreground">
      <View className="absolute inset-0 items-center justify-center">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="대표 영상 재생"
          className="size-12 items-center justify-center rounded-full bg-primary active:opacity-80"
        >
          <Play
            size={20}
            color={semantic.onPrimary}
            fill={semantic.onPrimary}
          />
        </Pressable>
      </View>
      <View className="absolute bottom-3 right-3 rounded-sm border border-white/25 bg-foreground/70 px-1.5 py-0.5">
        <Text className="text-fm-caption text-primary-foreground">
          {durationLabel}
        </Text>
      </View>
    </View>
  );
};
