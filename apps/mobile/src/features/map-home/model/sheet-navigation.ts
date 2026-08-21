import type { HomePanelKind } from "./panel-branch";
import type { SheetStage } from "./sheet-snap";
import type { ThemeId } from "./themes";

/**
 * 시트 단계 이동 규칙 (MSG-427 A2~A6) — 순수 함수.
 * 지도 SDK·라우터에 의존하지 않는다 (RN 경계: 화면이 결과를 받아 모듈 상태에 반영한다).
 *
 * 헤더 `‹`·헤더 `✕`·Android 하드웨어 뒤로가기가 **같은 규칙**을 타야 하는데(A3·A4·A5),
 * 세 곳에 각자 삼항 사슬을 두면 한 곳만 어긋나는 사고가 난다 — 값 하나로 뽑는다.
 */
export interface HomeSelection {
  activeTheme: ThemeId | null;
  selectedMissionId: number | null;
  selectedGridId: string | null;
}

/**
 * 한 단계 위로. [A3·A5]
 * 격자 상세 → 미션/코스 상세 또는 칩 목록·요약, 미션·코스 상세 → 칩 목록,
 * 칩 목록·요약 → 기본 시트(테마 해제). 최상위(기본 시트)면 **null** — 화면을 벗어난다.
 */
export const stepBack = (selection: HomeSelection): HomeSelection | null => {
  if (selection.selectedGridId !== null)
    return { ...selection, selectedGridId: null };
  if (selection.selectedMissionId !== null)
    return { ...selection, selectedMissionId: null };
  if (selection.activeTheme !== null)
    return { activeTheme: null, selectedMissionId: null, selectedGridId: null };
  return null;
};

/** 헤더 `✕`·칩 재탭 — 최초 홈 상태로 복귀한다. [A2·A4] */
export const closeTheme = (_selection: HomeSelection): HomeSelection => ({
  activeTheme: null,
  selectedMissionId: null,
  selectedGridId: null,
});

/**
 * 헤더 `✕` 노출 여부. [A4]
 * Figma 실측: 핫구역 요약(화면 1)과 상세 4종(2·4·6·8·9)에만 있고, 목록 시트(3·5·7)에는
 * 없다 — 목록의 해제 수단은 칩 재탭이다.
 */
export const showsCloseButton = (kind: HomePanelKind): boolean =>
  kind !== "mission-list" && kind !== "course-list" && kind !== "region";

/**
 * 시트 스냅 단계. [A6]
 * Figma 시트 높이 실측: 목록·요약은 y405/355(절반 = 2단계), 상세는 y148/612(전체 = 1단계).
 */
export const sheetStageFor = (kind: HomePanelKind): SheetStage =>
  kind === "mission-detail" ||
  kind === "course-detail" ||
  kind === "grid-detail"
    ? 1
    : 2;
