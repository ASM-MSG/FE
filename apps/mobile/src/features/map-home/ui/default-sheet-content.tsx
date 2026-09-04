import { useEffect } from "react";
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { GestureDetector } from "react-native-gesture-handler";
import { semantic } from "@fillmap/design-tokens";
import { Button, VideoCard } from "@fillmap/ui-native";
import { formatDuration } from "../../../shared/format";
import type { ExploreGridResponseDto } from "../../../shared/api/sdk";
import { gridCardLabel } from "../model/grid-card";
import type { SheetState } from "../model/home-sheet-state";
import type { HomeSheetContentContext } from "./home-sheet";

/**
 * 시트 기본 콘텐츠 (MSG-423 요구 1·2·6·7) — 헤더(현재 동 이름 + "전체 보기") +
 * 1열 격자 카드 목록. 2열 미니카드 그리드·정렬 칩(인기순/최신순)은 폐기됐다
 * (Figma 정본 14799:25653에 없고, 서버 정렬은 sort=LATEST 고정 — 승인 Q3).
 *
 * 상태 4분기는 model `deriveSheetState`가 정하고 여기는 렌더만 한다 —
 * **실패 시 목 데이터로 대체하는 경로가 없다** (요구 7).
 */

/** 빈·실패 문구 — 티켓·Figma에 문안이 없어 웹 관례를 따른다 (스펙 추정 7) */
const EMPTY_TEXT = "이 지역에는 아직 영상이 없어요";
const ERROR_TEXT = "불러오지 못했어요";

interface DefaultSheetContentProps extends HomeSheetContentContext {
  /** 헤더 좌측 — 지도 중심의 행정동 이름 (요구 2). 미도착·행정동 밖이면 null */
  regionName: string | null;
  /** 격자 카드 원본 — 라벨 조합(gridCardLabel)과 길이 포맷은 이 뷰가 한다 (웹 RegionGridCard 관례) */
  grids: ExploreGridResponseDto[];
  state: SheetState;
  /** 실패 상태의 "다시 시도" — 세 쿼리를 함께 재조회한다 (요구 7) */
  onRetry: () => void;
  /** 격자 카드 탭 → 격자 상세 시트 (MSG-571 AC 1·2) — 지도 셀 탭과 같은 선택 경로, 게이트 없음 */
  onSelectGrid: (gridId: string) => void;
  /** 헤더 "전체 보기" → 전체 지역 목록 모드 (MSG-571 AC 5) */
  onOpenRegionList: () => void;
}

/** 상태 문구·로더가 공통으로 쓰는 여백 박스 — 시트 중앙에 한 줄로 놓는다 */
const StatusBox = ({ children }: { children: ReactNode }) => (
  <View className="flex-1 items-center justify-center gap-sm py-lg">
    {children}
  </View>
);

export const DefaultSheetContent = ({
  scrollGesture,
  scrollEnabled,
  onScrollOffsetChange,
  regionName,
  grids,
  state,
  onRetry,
  onSelectGrid,
  onOpenRegionList,
}: DefaultSheetContentProps) => {
  // 콘텐츠 교체·상태 전환으로 스크롤 뷰가 재마운트되면 오프셋 가드가 스테일해진다 —
  // 새 스크롤 뷰는 항상 0에서 시작한다 (쉘 계약)
  useEffect(() => {
    onScrollOffsetChange(0);
  }, [onScrollOffsetChange, state]);

  return (
    <View className="flex-1 gap-sm">
      <View className="flex-row items-center gap-sm">
        <Text
          numberOfLines={1}
          className="flex-1 text-fm-title text-foreground"
        >
          {regionName ?? "현재 위치"}
        </Text>
        {/* 헤더 행(y≥26dp)은 핸들 Pressable hitSlop 밴드(0~26dp) 밖이다 — 행 위치를
            바꾸면 MSG-445 C1(헤더 탭 불가)이 재발한다 */}
        <Pressable
          accessibilityRole="button"
          onPress={onOpenRegionList}
          hitSlop={8}
          className="active:opacity-80"
        >
          <Text className="text-fm-body text-primary">전체 보기</Text>
        </Pressable>
      </View>

      {state === "loading" && (
        <StatusBox>
          <ActivityIndicator color={semantic.primary} />
        </StatusBox>
      )}

      {state === "empty" && (
        <StatusBox>
          <Text className="text-fm-body text-foreground-muted">
            {EMPTY_TEXT}
          </Text>
        </StatusBox>
      )}

      {state === "error" && (
        <StatusBox>
          <Text className="text-fm-body text-foreground-muted">
            {ERROR_TEXT}
          </Text>
          {/* 웹 RetryNotice는 secondary(bg-background)지만, 모바일 시트는 배경이
              surface-elevated(흰색)라 같은 흰 버튼이면 터치 대상이 보이지 않는다 —
              채워진 primary로 둔다 (토큰만 사용, 임의값 없음) */}
          <Button text="다시 시도" size="sm" onPress={onRetry} />
        </StatusBox>
      )}

      {state === "list" && (
        <GestureDetector gesture={scrollGesture}>
          <ScrollView
            style={{ flex: 1 }}
            scrollEnabled={scrollEnabled}
            bounces={false}
            overScrollMode="never"
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            onScroll={(event) => {
              onScrollOffsetChange(event.nativeEvent.contentOffset.y);
            }}
          >
            <View className="gap-md pb-9">
              {grids.map((grid) => {
                // list 상태는 행정동 확정을 전제한다(regionCode가 있어야 카드 조회가
                // 나간다) — 폴백 빈 문자열에는 도달하지 않는다
                const label = gridCardLabel(
                  grid.zoneName,
                  grid.zoneCell,
                  regionName ?? "",
                );
                return (
                  <VideoCard
                    key={grid.gridId}
                    src={grid.coverThumbnailUrl ?? undefined}
                    fallback={label}
                    durationLabel={formatDuration(grid.coverDurationSec)}
                    title={label}
                    meta={`${grid.videoCount}개 영상`}
                    accessibilityLabel={`${label}, ${grid.videoCount}개 영상`}
                    onPress={() => onSelectGrid(grid.gridId)}
                  />
                );
              })}
            </View>
          </ScrollView>
        </GestureDetector>
      )}
    </View>
  );
};
