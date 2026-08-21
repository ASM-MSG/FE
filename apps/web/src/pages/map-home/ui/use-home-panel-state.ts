import { homePanelKind } from "@/features/map-home/model/panel-branch";
import type {
  CourseView,
  MissionView,
} from "@/features/map-home/model/mission-view";
import type { ThemeId } from "@/features/map-home/model/theme";
import { useRegionPanelStore } from "@/features/region/model/region-panel-store";
import {
  deriveReloadTarget,
  type ReloadTarget,
} from "@/features/region/model/region-reload";
import type { DisplayedRegion } from "@/features/region/model/region-panel-store";

/**
 * 좌측 패널 분기 + "장소 불러오기" 대상 파생 (MSG-451 — 페이지 300줄 분할).
 * 뷰-레이어 훅: 판정은 순수 함수(panel-branch·region-reload)가 하고 여기는 조립만 한다.
 * 두 파생을 한 훅에 두는 이유는 **불러오기 대상이 패널 분기에 의존**하기 때문이다 —
 * 나눠 두면 호출부가 panel을 받아 다시 넘기는 왕복이 생긴다.
 */
interface HomePanelStateInput {
  activeTheme: ThemeId | null;
  selectedMission: MissionView | null;
  selectedCourse: CourseView | null;
  selectedCellId: string | null;
  committedRegion: DisplayedRegion | null;
  currentRegion: ReloadTarget | null;
  zoom: number;
}

export const useHomePanelState = ({
  activeTheme,
  selectedMission,
  selectedCourse,
  selectedCellId,
  committedRegion,
  currentRegion,
  zoom,
}: HomePanelStateInput): {
  panel: ReturnType<typeof homePanelKind>;
  reloadTarget: ReloadTarget | null;
} => {
  const panelMode = useRegionPanelStore((s) => s.mode);

  // 선택한 미션이 목록에 실제로 있을 때만 상세로 분기한다 (codex 리뷰 반영).
  // 재조회로 그 미션이 목록에서 빠지면 selectedMission이 null이 되는데, id만 보고
  // "mission-detail"로 분기하면 페이지의 JSX 가드가 전부 미끄러져 **칩이 켜진 채 지역
  // 패널**이 뜬다. 없는 미션은 선택이 없는 것으로 보아 목록으로 돌아간다
  const resolvedMissionId =
    (selectedMission ?? selectedCourse)?.missionId ?? null;
  const panel = homePanelKind({
    activeTheme,
    selectedMissionId: resolvedMissionId,
    selectedGridId: selectedCellId,
  });

  // "장소 불러오기" (MSG-328 AC 10) — 칩 4종 화면과 지역 격자 패널이 같은 버튼을
  // 공유하므로 패널이 아니라 페이지가 소유한다. 판정은 순수 함수(region-reload) 몫
  const reloadTarget = deriveReloadTarget({
    // 격자 상세는 지역 격자 목록 위에 겹쳐 열릴 뿐이라 갱신 대상이 화면 뒤에 남아 있다 —
    // 미션·코스 상세만 목록을 대체한다 (MSG-451 AC 15)
    isThemeDetailPanel: panel === "mission-detail" || panel === "course-detail",
    isGridListMode: panelMode === "grids",
    committedRegionCode: committedRegion?.regionCode ?? null,
    currentRegion,
    zoom,
  });

  return { panel, reloadTarget };
};
