import { Text, View } from "react-native";
import { Play } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Thumbnail, cx } from "@fillmap/ui-native";
import { formatDuration } from "../../../shared/format";
import type { ThemeSheetVideo } from "../model/theme-sheet";

interface ThemeVideoCardProps {
  video: ThemeSheetVideo;
  className?: string;
}

/**
 * 테마 격자 섹션의 전폭 대표 영상 카드 (MSG-298 AC 13·14·15) — Figma 14103:351.
 * 썸네일+재생+길이 배지 문법은 GridVideoCard와 같지만 하단 메타(업로더·시점·조회수)가
 * 달라 별도 컴포넌트 (스펙 — 도메인 결합이라 승격 아님). Figma의 재생 버튼은
 * primary 원 + 흰 아이콘 (GridVideoCard의 흰 원 + primary와 반전 — 프레임 실측).
 * mock은 썸네일 이미지가 없어 Thumbnail 폴백 상태로 표시한다 (Figma 오탐 방지 5).
 */
export const ThemeVideoCard = ({ video, className }: ThemeVideoCardProps) => (
  <View className={cx("gap-1.5", className)}>
    <View className="w-full">
      <Thumbnail className="h-50 w-full" />
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
      >
        <View className="size-7 items-center justify-center rounded-full bg-primary">
          <Play
            size={12}
            color={semantic.onPrimary}
            fill={semantic.onPrimary}
          />
        </View>
      </View>
      <View className="absolute bottom-1.5 right-1.5 rounded-sm bg-foreground/75 px-1.5 py-0.5">
        <Text className="text-fm-caption text-primary-foreground">
          {formatDuration(video.durationSec)}
        </Text>
      </View>
    </View>
    <View className="flex-row items-center justify-between">
      <View className="flex-row items-center gap-xxs">
        {/* 내 영상이면 primary 색 강조 (AC 14) */}
        <Text
          className={cx(
            "text-fm-body-strong",
            video.isMine ? "text-primary" : "text-foreground",
          )}
        >
          {video.uploaderLabel}
        </Text>
        <Text className="text-fm-label text-foreground-muted">
          · {video.uploadedAtLabel}
        </Text>
      </View>
      <Text className="text-fm-label text-foreground-muted">
        {video.viewCountLabel}
      </Text>
    </View>
  </View>
);
