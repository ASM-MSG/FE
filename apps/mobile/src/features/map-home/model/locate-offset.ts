import {
  PEEK_HEIGHT,
  sheetStagePositions,
  type SheetStage,
} from "./sheet-snap";

/**
 * 내 위치 버튼의 하단 오프셋 (MSG-423 요구 8) — 순수 함수.
 * 시트가 커진 만큼 버튼을 함께 올려 어느 단계에서도 시트에 가리지 않게 한다.
 *
 * 좌표계: 반환값은 **화면 바닥 기준 버튼 하단의 높이(px)**다. 시트 상단의 같은 기준
 * 높이는 `bottomOffset + (containerHeight - positions[stage])`이고, 여기에 여백을 더한다.
 */

/** 시트 상단과 버튼 사이 여백(px) — 기존 홈 화면 값(12) 유지 */
export const LOCATE_GAP = 12;

/**
 * 시트 단계·컨테이너 높이 → 버튼 하단 오프셋.
 * - 4단계(시트 숨김)는 피크(3단계) 기준값을 유지한다 — 시트가 없다고 버튼이 바텀 내비에
 *   붙어 내려앉으면 복귀 시 다시 튀어 오른다
 * - 컨테이너 미측정(높이 0 — 진입 첫 프레임)도 피크 기준값으로 시작한다
 */
export const locateBottomOffset = (
  stage: SheetStage,
  containerHeight: number,
  bottomOffset: number,
): number => {
  if (containerHeight === 0) return bottomOffset + PEEK_HEIGHT + LOCATE_GAP;
  const positions = sheetStagePositions(containerHeight);
  const sheetTop = positions[stage === 4 ? 3 : stage];
  return bottomOffset + (containerHeight - sheetTop) + LOCATE_GAP;
};
