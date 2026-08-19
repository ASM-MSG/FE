import { Text, View } from "react-native";
import type { RecentRegion } from "../../../entities/dex/model/dex";
import { RecentRegionRow } from "./recent-region-row";

interface MapTabBodyProps {
  /** 표시 목록 — 파생 → 감춤 → 20개 상한을 마친 결과 (L1~L4) */
  regions: RecentRegion[];
  /**
   * 원본 수집 존재 여부 — 빈 상태 문구는 "수집 0건"일 때만 띄운다.
   * X로 전부 감춘 상태와 구분하기 위한 입력이다 (S10).
   */
  hasCollected: boolean;
  onSelect: (region: RecentRegion) => void;
  onRemove: (regionName: string) => void;
}

/**
 * SOURCE: Figma "개인 도감 — 지도 탭"(node 14799:26328) 본문 — MSG-425 S4·S5·S10.
 * "최근 수집한 격자" 섹션 헤더 + 동 단위 목록(최근순, 최대 20행) 또는 빈 상태 문구.
 *
 * 섹션 헤더 타이포는 Figma 16px SemiBold에 대응 토큰이 없어 `text-fm-title`(15/600)을
 * 쓴다(오탐 방지 3). 행 간격 14px은 Figma 실측 그대로 `gap-3.5`.
 * "내 지도" dashed 플레이스홀더·"지도 전체 보기" 버튼은 삭제했다 — Figma 정본에 지도
 * 렌더 영역이 없고 티켓 [제외 범위]이기도 하다(추정 A5).
 */
export const MapTabBody = ({
  regions,
  hasCollected,
  onSelect,
  onRemove,
}: MapTabBodyProps) => (
  <View className="gap-sm">
    <Text className="text-fm-title text-foreground">최근 수집한 격자</Text>
    {regions.length === 0 ? (
      // 전부 감춘 상태에서는 안내를 띄우지 않는다 — 수집 0건과 구분되는 상태다 (S10)
      hasCollected ? null : (
        <Text className="py-lg text-center text-fm-body text-foreground-muted">
          아직 수집한 격자가 없어요. 첫 영상을 올려 격자를 수집해 보세요.
        </Text>
      )
    ) : (
      <View className="gap-3.5">
        {regions.map((region) => (
          <RecentRegionRow
            key={region.regionName}
            region={region}
            onSelect={onSelect}
            onRemove={onRemove}
          />
        ))}
      </View>
    )}
  </View>
);
