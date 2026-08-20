import type { ThemeId } from "./themes";

/**
 * 시트 콘텐츠 분기 (MSG-427 A1) — 웹 `features/map-home/model/panel-branch.ts`의 복제본.
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다.
 * 동등성은 panel-branch.parity.test.ts가 웹 원본을 동적 import해 단정한다.
 *
 * 분기 규칙을 뷰의 삼항 사슬에 두면 칩 4종 × 상세 2단이 얽혀 읽히지 않으므로 값 하나로 뽑는다.
 * MSG-428(클러스터)이 이 파일 위에 리베이스하므로 화면의 스위치는 이 값 하나만 본다.
 */
export type HomePanelKind =
  | "grid-detail"
  | "mission-detail"
  | "course-detail"
  | "hot-region"
  | "mission-list"
  | "course-list"
  | "region";

interface PanelBranchInput {
  activeTheme: ThemeId | null;
  /** 선택된 미션·코스 id — 목록에서 카드를 고르면 채워진다 */
  selectedMissionId: number | null;
  /** 선택된 격자 id — 지도 격자 탭·코스 스팟 탭으로 채워진다 */
  selectedGridId: string | null;
}

/**
 * 분기 우선순위: 격자 상세 > 미션/코스 상세 > 칩 목록 > 기본 시트. [A1]
 * 핫구역에는 미션이 없으므로 선택 미션이 남아 있어도 동 요약을 유지한다 —
 * 칩을 바꿔도 선택이 남는 경우의 유령 상세를 구성상 막는다.
 */
export const homePanelKind = ({
  activeTheme,
  selectedMissionId,
  selectedGridId,
}: PanelBranchInput): HomePanelKind => {
  if (selectedGridId !== null) return "grid-detail";

  switch (activeTheme) {
    case "hot":
      return "hot-region";
    case "festival":
    case "popup":
      return selectedMissionId !== null ? "mission-detail" : "mission-list";
    case "route":
      return selectedMissionId !== null ? "course-detail" : "course-list";
    default:
      return "region";
  }
};
