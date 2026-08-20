import { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@fillmap/ui-native";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import {
  EMPTY_UPLOAD_HISTORY_MESSAGE,
  formatYearHeadline,
  formatYearSubtitle,
} from "../model/dex-format";
import {
  GRASS_MODAL_WEEKS,
  buildGrassWeeks,
  deriveGrassSummary,
  todayKstDate,
} from "../model/upload-grass";
import { useUploadHistoryQuery } from "../model/use-collection-query";
import { DexErrorState } from "./dex-error-state";
import { DexTabLoading } from "./dex-tab-loading";
import { UploadGrassGrid } from "./upload-grass-grid";

/**
 * SOURCE: Figma "기록 전체 보기"(node 14857:404) — MSG-430 S10·S11.
 * 1년(53주) 업로드 기록 전면 화면 — `‹` + "업로드 기록" 헤더 · 헤드라인 · 부제 ·
 * "최근 1년" 라벨 · 가로 스크롤 53주 잔디 · 좌우 넘김 안내. 하단 탭바는 유지된다.
 *
 * 웹은 모달(`UploadHistoryModal`)이지만 모바일 시안은 전면 화면이고, 라우트로 두면
 * 도감 셸의 `AppHeader`·`BackHandler`를 건드리지 않아도 된다(승인 A9-b).
 * "최근 1년"은 **정적 라벨**이다 — `GET /api/collections/upload-history`에 기간
 * 파라미터가 없어 동작 없는 드롭다운 시늉을 두지 않는다(승인 A3, 시안의 캐럿과 의도적 차이).
 */
export const UploadHistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const history = useUploadHistoryQuery();
  const historyData = history.data;

  const todayKst = todayKstDate();
  const weeks = useMemo(
    () => buildGrassWeeks(historyData ?? [], todayKst, GRASS_MODAL_WEEKS),
    [historyData, todayKst],
  );
  const summary = useMemo(
    () => deriveGrassSummary(historyData ?? [], todayKst, GRASS_MODAL_WEEKS),
    [historyData, todayKst],
  );

  const headline = formatYearHeadline(summary);
  const subtitle = formatYearSubtitle(summary);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="업로드 기록" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-lg pb-lg pt-md"
      >
        {history.isError ? (
          <DexErrorState
            title="업로드 기록을 불러오지 못했어요"
            description="네트워크 상태를 확인하고 다시 시도해 주세요"
            onRetry={() => void history.refetch()}
          />
        ) : !historyData ? (
          <DexTabLoading />
        ) : (
          <View className="gap-md">
            <View className="gap-xxs">
              <Text className="text-fm-title text-foreground">{headline}</Text>
              <Text className="text-fm-body text-foreground-muted">
                {subtitle}
              </Text>
            </View>
            {/* 정적 라벨 — 연도 전환 데이터가 없다 (승인 A3) */}
            <View className="self-start rounded-full border border-border bg-surface-soft px-sm py-1.5">
              <Text className="text-fm-body text-foreground-body">
                최근 1년
              </Text>
            </View>
            <UploadGrassGrid
              weeks={weeks}
              scrollable
              a11ySummary={`지난 1년 업로드 잔디: ${headline} · ${subtitle}`}
            />
            <Text className="text-center text-fm-caption text-foreground-muted">
              ← 좌우로 넘겨 지난 1년을 확인하세요
            </Text>
            {historyData.length === 0 && (
              <Text className="text-center text-fm-body text-foreground-muted">
                {EMPTY_UPLOAD_HISTORY_MESSAGE}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
      <AppBottomNav />
    </View>
  );
};
