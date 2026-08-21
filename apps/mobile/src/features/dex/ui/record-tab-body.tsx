import { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  EMPTY_UPLOAD_HISTORY_MESSAGE,
  formatGrassMeta,
} from "../model/dex-format";
import {
  GRASS_TAB_WEEKS,
  buildGrassWeeks,
  deriveGrassSummary,
  todayKstDate,
} from "../model/upload-grass";
import { useUploadHistoryQuery } from "../model/use-collection-query";
import { DexErrorState } from "./dex-error-state";
import { DexTabLoading } from "./dex-tab-loading";
import { UploadGrassGrid } from "./upload-grass-grid";

/**
 * SOURCE: Figma "개인 도감 — 기록 탭"(node 14799:26454) — MSG-430 S8·S9·S12.
 * 웹 `pages/dex/ui/RecordTabBody.tsx` 미러.
 * 섹션 헤더("업로드 기록" + "전체 보기 ›") + 메타 줄 + 24주 잔디 카드 + 빈 상태 안내.
 *
 * 수치는 전부 실데이터 파생이다(시안 "48일·12일"은 플레이스홀더). 메타의 "최장 연속"은
 * 창 내 최장 스트릭이라 상단 통계 타일의 `currentStreak`(현재 진행 중)와 다른 지표다 —
 * 값 상이가 정상이다.
 *
 * "전체 보기"는 웹의 1년 모달 대신 `/dex/history` 라우트로 이동한다 — 셸이 헤더·
 * 하드웨어 뒤로가기를 소유하고 있어 오버레이로 가면 셸을 고쳐야 하기 때문이다(승인 A9-b).
 */
export const RecordTabBody = () => {
  const router = useRouter();
  const history = useUploadHistoryQuery();
  const historyData = history.data;

  /*
   * KST "오늘" — 렌더마다 재계산한다. 마운트 고정이면 탭을 켜 둔 채 KST 자정을 넘긴 뒤
   * 도착한 새 날짜 이력이 미래로 걸러져 스테일이 된다(웹 codex 리뷰 반영분 승계).
   * 값이 문자열이라 자정을 넘기는 렌더에서만 아래 memo가 재파생된다.
   */
  const todayKst = todayKstDate();
  const weeks = useMemo(
    () => buildGrassWeeks(historyData ?? [], todayKst, GRASS_TAB_WEEKS),
    [historyData, todayKst],
  );
  const summary = useMemo(
    () => deriveGrassSummary(historyData ?? [], todayKst, GRASS_TAB_WEEKS),
    [historyData, todayKst],
  );

  if (history.isError) {
    return (
      <DexErrorState
        title="업로드 기록을 불러오지 못했어요"
        onRetry={() => void history.refetch()}
      />
    );
  }
  if (!historyData) {
    return <DexTabLoading />;
  }

  const meta = formatGrassMeta(GRASS_TAB_WEEKS, summary);

  return (
    <View className="gap-sm">
      <View className="flex-row items-center justify-between">
        <Text className="text-fm-title text-foreground">업로드 기록</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.navigate("/dex/history")}
        >
          <Text className="text-fm-body text-primary">전체 보기 ›</Text>
        </Pressable>
      </View>
      <Text className="text-fm-caption text-foreground-muted">{meta}</Text>
      <UploadGrassGrid weeks={weeks} a11ySummary={`업로드 잔디: ${meta}`} />
      {historyData.length === 0 && (
        <Text className="text-center text-fm-body text-foreground-muted">
          {EMPTY_UPLOAD_HISTORY_MESSAGE}
        </Text>
      )}
    </View>
  );
};
