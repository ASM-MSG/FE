import { Text, View } from "react-native";
import { ProgressBar, StatTile } from "@fillmap/ui-native";
import type { DexSummary, RegionStat } from "../../../entities/dex/model/dex";
import { clampPct } from "../model/dex-summary";
import { formatCountTile, formatStreakTile } from "../model/dex-format";
import { formatProgressRate, shortRegionName } from "../model/region-label";

interface DexHeaderSummaryProps {
  /** 현재 위치 행정동 통계 — 미도착·행정동 밖이면 null이라 진행 바를 숨긴다 */
  regionStat: RegionStat | null;
  summary: DexSummary;
}

/**
 * SOURCE: Figma "개인 도감 — 지도 탭"(node 14799:26328) 상단 블록 — MSG-425 S1·S2.
 * 페이지 타이틀 + "{행정동} 탐험률" 라벨/퍼센트 + 진행 바 + 통계 타일 3개.
 *
 * **[공통 헤더] 3탭 전부가 본다 — MSG-430(뱃지·기록 본문)은 이 파일을 수정하지 않는다.**
 *
 * 종전(MSG-299) 프로필 요약 카드(닉네임·아바타·"스트릭 전체 기록 보기" 링크)를 대체한다 —
 * Figma 정본 두 프레임 어디에도 프로필 축이 없다(요구 ①, 추정 A1). 통계 타일 타이포는
 * `StatTile` 내장값(fm-display/fm-label)이 Figma 실측(16px/11px)보다 크지만 공통 컴포넌트
 * 재사용이 우선이며 토큰에 18px 단이 없다(MSG-420 확정, 오탐 방지 2).
 * 진행 트랙은 Figma `#ebebef`에 대응 토큰이 없어 `ProgressBar` 기본 `bg-border`를 쓴다(오탐 방지 4).
 */
export const DexHeaderSummary = ({
  regionStat,
  summary,
}: DexHeaderSummaryProps) => {
  const pct = regionStat ? clampPct(regionStat.progressRate) : null;

  return (
    <View className="gap-sm">
      <Text className="text-fm-display text-foreground">내 도감</Text>

      {/* 탐험률 — 미도착이면 자리를 비워둔다(잘못된 0%를 스치듯 보여주지 않는다) */}
      {regionStat && pct !== null && (
        <View className="gap-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-fm-body-strong text-foreground">
              {shortRegionName(regionStat.regionName)} 탐험률
            </Text>
            <Text className="text-fm-body-strong text-primary">
              {formatProgressRate(pct)}
            </Text>
          </View>
          {/* Figma 트랙 높이 8px — ProgressBar 기본 h-1.5(6px) 위에 덮는다 */}
          <ProgressBar value={pct / 100} className="!h-2" />
        </View>
      )}

      <View className="flex-row gap-xs">
        <StatTile
          value={formatCountTile(summary.totalGridCount)}
          label="수집 격자"
          className="rounded-md border border-border bg-background py-sm"
        />
        <StatTile
          value={formatCountTile(summary.badgeCount)}
          label="획득 뱃지"
          className="rounded-md border border-border bg-background py-sm"
        />
        <StatTile
          value={formatStreakTile(summary.currentStreak)}
          label="연속 스트릭"
          className="rounded-md border border-border bg-background py-sm"
        />
      </View>
    </View>
  );
};
