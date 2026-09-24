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

/**
 * 지도 콘텐츠 하단 인셋(px) — `NaverMapView.mapPadding.bottom` (MSG-601 iOS 실기 환류).
 * 지도가 화면 전체를 덮고 그 위에 바텀 내비와 시트가 얹히므로, 이 값을 넣어야 `panTo`·
 * `fitBounds`의 "중앙"과 SDK 로고·축척이 **시트 위 보이는 영역** 기준이 된다(네이버 지도 앱
 * 동작). 카메라 이벤트 region은 두 플랫폼 모두 `coveringBounds`(뷰 전체)라 격자·조회 bbox는
 * 영향받지 않는다.
 * - 1단계(전체 확장, 시트 90%)는 2단계(절반) 값으로 캡 — 콘텐츠 영역이 10%만 남으면 SDK 카메라가
 *   불안정해지고, 그 단계에서는 지도가 사실상 안 보인다
 * - 4단계·미측정은 내 위치 버튼과 같은 이유로 피크 기준값
 */
export const mapBottomInset = (
  stage: SheetStage,
  containerHeight: number,
  bottomOffset: number,
): number => {
  if (containerHeight === 0) return bottomOffset + PEEK_HEIGHT;
  const positions = sheetStagePositions(containerHeight);
  const effective = stage === 4 ? 3 : stage === 1 ? 2 : stage;
  return bottomOffset + (containerHeight - positions[effective]);
};
