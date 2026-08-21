import { View } from "react-native";
import type { HomeMissions } from "../api/use-home-missions";
import type { HomeSheetContentContext } from "./home-sheet";
import { CourseCard } from "./course-card";
import { SheetNotice } from "./sheet-notice";
import { SheetScrollView } from "./sheet-scroll-view";
import { SheetStatusView } from "./sheet-status-view";
import { ThemeBadgeHeader } from "./theme-badge-header";

/**
 * 경로추천 목록 시트 (MSG-427 E1·E2·E3, Figma 화면 7).
 * 축제·팝업 목록과 헤더·상태 분기가 같고 카드 모양만 다르다 (Figma: 썸네일 없음 + 진행 바).
 */
interface CourseListSheetContentProps extends HomeSheetContentContext {
  missions: HomeMissions;
  onSelect: (missionId: number) => void;
}

export const CourseListSheetContent = ({
  missions,
  onSelect,
  ...sheet
}: CourseListSheetContentProps) => (
  <View className="flex-1 gap-sm">
    <ThemeBadgeHeader theme="route" count={missions.courseViews.length} />

    <SheetStatusView
      state={missions.listState}
      emptyText="지금 추천할 코스가 없어요"
      errorText="추천 코스를 불러오지 못했어요"
      onRetry={missions.retry}
    />

    {missions.listState === "list" && (
      <SheetScrollView {...sheet} resetKey="route">
        {missions.progressFailed && (
          <SheetNotice
            message="진행도를 불러오지 못했어요"
            onRetry={missions.retry}
          />
        )}
        {missions.courseViews.map((view) => (
          <CourseCard
            key={view.missionId}
            view={view}
            progressFailed={missions.progressFailed}
            onSelect={onSelect}
          />
        ))}
      </SheetScrollView>
    )}
  </View>
);
