import { Text, View } from "react-native";
import { toReportRowView, type MyReportItem } from "../model/report-history";

/**
 * 신고 1건 행 (MSG-448 기준 20) — 대상 · 사유 · 시점 · 처리 상태 4필드.
 * 표시 문자열은 전부 `toReportRowView`가 만든다(순수 파생) — 이 행은 배치만 한다.
 */
export const ReportHistoryRow = ({ item }: { item: MyReportItem }) => {
  const view = toReportRowView(item);

  return (
    <View className="gap-xxs rounded-md border border-border bg-surface-soft p-md">
      <View className="flex-row items-center gap-sm">
        <Text className="text-fm-body text-foreground" numberOfLines={1}>
          {view.target}
        </Text>
        <View className="h-px flex-1" />
        <Text className="text-fm-label text-foreground-body">
          {view.status}
        </Text>
      </View>
      <Text className="text-fm-caption text-foreground-muted">
        {`${view.reason} · ${view.reportedAt}`}
      </Text>
    </View>
  );
};
