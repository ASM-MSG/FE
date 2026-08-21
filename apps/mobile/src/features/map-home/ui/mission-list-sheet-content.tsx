import { View } from "react-native";
import type { HomeMissions } from "../api/use-home-missions";
import { THEME_META, type ThemeId } from "../model/themes";
import type { HomeSheetContentContext } from "./home-sheet";
import { MissionCard } from "./mission-card";
import { SheetNotice } from "./sheet-notice";
import { SheetScrollView } from "./sheet-scroll-view";
import { SheetStatusView } from "./sheet-status-view";
import { ThemeBadgeHeader } from "./theme-badge-header";

/**
 * 지역축제·팝업스토어 목록 시트 (MSG-427 D3·D4·D13, Figma 화면 3·5).
 * 헤더는 `{테마 배지} · {N}개` 한 줄뿐이다 — Figma 실측상 목록 3종에는 뒤로가기도 ✕도
 * 없다(A4). 해제는 칩 재탭이다.
 *
 * 진행도만 실패하면 목록은 그대로 두고 위에 안내만 얹는다 (D13).
 */
interface MissionListSheetContentProps extends HomeSheetContentContext {
  theme: Extract<ThemeId, "festival" | "popup">;
  missions: HomeMissions;
  onSelect: (missionId: number) => void;
}

export const MissionListSheetContent = ({
  theme,
  missions,
  onSelect,
  ...sheet
}: MissionListSheetContentProps) => (
  <View className="flex-1 gap-sm">
    <ThemeBadgeHeader theme={theme} count={missions.missionViews.length} />

    <SheetStatusView
      state={missions.listState}
      emptyText={`지금 진행 중인 ${THEME_META[theme].label}가 없어요`}
      errorText={`${THEME_META[theme].label} 목록을 불러오지 못했어요`}
      onRetry={missions.retry}
    />

    {missions.listState === "list" && (
      <SheetScrollView {...sheet} resetKey={theme}>
        {missions.progressFailed && (
          <SheetNotice
            message="진행도를 불러오지 못했어요"
            onRetry={missions.retry}
          />
        )}
        {missions.missionViews.map((view) => (
          <MissionCard
            key={view.missionId}
            view={view}
            theme={theme}
            onSelect={onSelect}
          />
        ))}
      </SheetScrollView>
    )}
  </View>
);
