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
  className?: string;
}

/**
 * 격자 영상 썸네일 카드 — 재생 아이콘·길이 뱃지(mm:ss)·격자명·영상 수 (AC 15).
 * 4차 콘텐츠 통일로 시트 2열 그리드가 유일 사용처 — 구 피크 가로 스크롤용
 * sm 변형·showDuration 옵션은 고아 정리(두 번째 용례가 생기면 그때 재도입).
 * mock은 썸네일 이미지가 없어 Thumbnail 폴백(빈 박스) 상태로 표시한다 (Figma 오탐 방지 4).
 * 격자명·영상 수 등 도메인 결합이라 features에 둔다 — 승격 후보 아님 (스펙).
 */
export const GridVideoCard = ({ video, className }: GridVideoCardProps) => (
  <View className={cx("gap-1.5", className)}>
    <View className="w-full">
      <Thumbnail className="h-25 w-full" />
      <View
        pointerEvents="none"
        className="absolute inset-0 items-center justify-center"
      >
        <View className="size-6.5 items-center justify-center rounded-full bg-background shadow-raised">
          <Play size={12} color={semantic.primary} fill={semantic.primary} />
        </View>
      </View>
      <View className="absolute bottom-1.5 right-1.5 rounded-sm bg-foreground/75 px-1.5 py-0.5">
        <Text className="text-fm-caption text-primary-foreground">
          {formatDuration(video.durationSec)}
        </Text>
      </View>
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
