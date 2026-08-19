import { Pressable, Text, View } from "react-native";
import { LayoutGrid, X } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import type { RecentRegion } from "../../../entities/dex/model/dex";
import { formatRecentRegionMeta } from "../model/dex-format";
import { shortRegionName } from "../model/region-label";

interface RecentRegionRowProps {
  region: RecentRegion;
  /** 행 탭 — 그 동의 갤러리 진입 배선은 부모(DexScreen) 몫 */
  onSelect: (region: RecentRegion) => void;
  /** X 탭 → 표시 목록에서 감춤 (수집 취소 아님 — 통계 타일 불변) */
  onRemove: (regionName: string) => void;
}

/**
 * SOURCE: Figma "개인 도감 — 지도 탭"(node 14799:26328) 목록 행 — MSG-425 S5.
 * 48px 격자 아이콘 타일 + 동 이름 + "{상대시간} · 영상 N개" + 우측 X 감춤 버튼.
 *
 * Figma 실측대로 행에 카드 배경·보더·radius가 없다(투명) — 종전 mock 행의
 * `border + bg-surface-soft` 껍데기는 제거했다. 시안 첫 행은 col 폭 314px 고정
 * 오토레이아웃 버그로 X가 프레임 밖으로 밀려 안 보이는데, 구현은 전 행 동일하게
 * X를 우측에 보여준다(오탐 방지 6 — 시안과 다른 것이 정답).
 * X는 14px 아이콘이라 44px 최소 터치 영역에 미달해 `hitSlop`으로 보강한다(MSG-420 a11y 환류).
 */
export const RecentRegionRow = ({
  region,
  onSelect,
  onRemove,
}: RecentRegionRowProps) => {
  const label = shortRegionName(region.regionName);

  return (
    <View className="flex-row items-center gap-sm">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 갤러리 열기`}
        onPress={() => onSelect(region)}
        className="min-w-0 flex-1 flex-row items-center gap-sm active:opacity-80"
      >
        <View className="size-12 items-center justify-center rounded-md bg-primary/10">
          <LayoutGrid size={20} color={semantic.primary} />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text
            numberOfLines={1}
            className="text-fm-body-strong text-foreground"
          >
            {label}
          </Text>
          <Text
            numberOfLines={1}
            className="text-fm-caption text-foreground-muted"
          >
            {formatRecentRegionMeta(region.lastUploadedAt, region.videoCount)}
          </Text>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label} 목록에서 제거`}
        hitSlop={12}
        onPress={() => onRemove(region.regionName)}
        className="active:opacity-60"
      >
        <X size={14} color={semantic.muted} />
      </Pressable>
    </View>
  );
};
