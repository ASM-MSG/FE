import { Text, View } from "react-native";
import { Play } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Thumbnail, cx } from "@fillmap/ui-native";
import type { GridVideoSummary } from "../model/mock-grid-videos";

/** 초 → "m:ss" 뱃지 표기 (예: 24 → "0:24") — 표시 전용 포맷 */
const formatDuration = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;

interface GridVideoCardProps {
  video: GridVideoSummary;
  /** 썸네일 높이 — sm: 홈 피크 시트 가로 스크롤(h-16), lg: 2열 그리드(h-25) */
  size?: "sm" | "lg";
  /** 영상 길이 뱃지(mm:ss) 표시 — 격자 썸네일 뷰 전용 (AC 15) */
  showDuration?: boolean;
  className?: string;
}

/**
 * 격자 영상 썸네일 카드 — 재생 아이콘·(선택) 길이 뱃지·격자명·영상 수.
 * 홈 피크 시트 가로 스크롤(AC 10)과 격자 썸네일 뷰 2열 그리드(AC 15) 공용.
 * mock은 썸네일 이미지가 없어 Thumbnail 폴백(빈 박스) 상태로 표시한다 (Figma 오탐 방지 4).
 * 격자명·영상 수 등 도메인 결합이라 features에 둔다 — 승격 후보 아님 (스펙).
 */
export const GridVideoCard = ({
  video,
  size = "sm",
  showDuration = false,
  className,
}: GridVideoCardProps) => (
  <View className={cx("gap-1.5", className)}>
    <View className="w-full">
      <Thumbnail className={cx("w-full", size === "lg" ? "h-25" : "h-16")} />
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
      >
        <View
          className={cx(
            "items-center justify-center rounded-full bg-background shadow-raised",
            size === "lg" ? "size-6.5" : "size-5",
          )}
        >
          <Play
            size={size === "lg" ? 12 : 10}
            color={semantic.primary}
            fill={semantic.primary}
          />
        </View>
      </View>
      {showDuration && (
        <View className="absolute bottom-1.5 right-1.5 rounded-sm bg-foreground/75 px-1.5 py-0.5">
          <Text className="text-fm-caption text-primary-foreground">
            {formatDuration(video.durationSec)}
          </Text>
        </View>
      )}
    </View>
    <View className="gap-0.5">
      <Text
        numberOfLines={1}
        className="text-fm-caption font-semibold text-foreground"
      >
        {video.label}
      </Text>
      <Text className="text-fm-caption text-foreground-muted">
        {video.videoCount}개 영상
      </Text>
    </View>
  </View>
);
