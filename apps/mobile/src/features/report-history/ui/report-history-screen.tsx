import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader, Button } from "@fillmap/ui-native";
import { useMyReportsQuery } from "../api/use-my-reports-query";
import { resolveReportListState } from "../model/report-history";
import { ReportHistoryRow } from "./report-history-row";

/**
 * 신고 관리 — 내가 신고한 내역 (MSG-448 기준 18·19·24·25·26).
 *
 * Figma 시안이 없다(스펙 실측 E). 앱 시각 관례를 따른다 —
 * `AppHeader` + `ScrollView` + `gap-lg px-5`.
 *
 * **서버 미연동 안내가 상시 보인다** (기준 26, 승인 Q3): 조회 엔드포인트가 없어 목록이
 * 항상 비는데, 안내가 없으면 빈 상태가 "신고한 적 없음"으로 오독된다 — 실제로 신고한
 * 사용자에게는 그것이 거짓이다. 목록·로딩·실패 분기는 `resolveReportListState`가 판정하고
 * (테스트가 4상태를 fixture로 구동한다) 이 화면은 그 판정만 읽는 얇은 스위치다.
 */
export const ReportHistoryScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const reports = useMyReportsQuery();
  const state = resolveReportListState(reports);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="신고 관리" onBack={() => router.back()} />
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-lg px-5 pb-lg pt-md"
      >
        {/* 상시 미연동 고지 (기준 26) — 목록 상태와 무관하게 항상 보인다 */}
        <View className="gap-xxs rounded-md border border-border bg-surface-soft p-md">
          <Text className="text-fm-body text-foreground">
            신고 내역은 서버 연동을 기다리고 있어요
          </Text>
          <Text className="text-fm-caption text-foreground-muted">
            접수된 신고는 정상 처리돼요. 연동이 끝나면 여기에서 처리 상태까지
            확인할 수 있어요
          </Text>
        </View>

        {state === "error" ? (
          // 조회 실패 + 재시도 (기준 25)
          <View className="items-center gap-md py-xl">
            <View className="items-center gap-xxs">
              <Text className="text-fm-title text-foreground">
                신고 내역을 불러오지 못했어요
              </Text>
              <Text className="text-center text-fm-body text-foreground-muted">
                네트워크 상태를 확인하고 다시 시도해 주세요
              </Text>
            </View>
            <Button
              text="다시 시도"
              variant="primary"
              size="sm"
              onPress={reports.refetch}
            />
          </View>
        ) : state === "loading" ? (
          <View className="py-xl">
            <ActivityIndicator color={semantic.primary} />
          </View>
        ) : state === "empty" ? (
          // 빈 상태 (기준 24) — 위 고지와 함께 읽혀야 오독되지 않는다
          <Text className="py-xl text-center text-fm-body text-foreground-muted">
            아직 신고한 내역이 없어요
          </Text>
        ) : (
          <View className="gap-sm">
            {reports.items.map((item) => (
              <ReportHistoryRow key={item.reportId} item={item} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};
