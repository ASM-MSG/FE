import type { GridCellIndex } from "../../../entities/cell/model/grid";
import { GRID_MIN_ZOOM } from "./visible-grid";

/**
 * 채움 셀 줌 게이트 (MSG-428 S1) — 웹 `features/map-home/model/cluster-overlay.ts`
 * (`gateFillCells`) 포팅. 순수 모듈 — 지도 SDK/RN에 의존하지 않는다.
 *
 * zoom < GRID_MIN_ZOOM이면 점령 채움을 걷어 서버 집계 마커에 화면을 넘긴다(웹 기존 계약).
 * 배경 격자선은 `buildVisibleCells`가 같은 임계로 이미 걷지만, 점령 채움은 지도에 별도
 * prop으로 가는 다른 층이라 그 게이트 밖이었다 — 저줌에서 채움과 마커가 공존하던 결함의
 * 원인이다(codex 리뷰가 잡은 포팅 누락).
 *
 * ## 웹 판별자 `cell.color !== undefined`의 모바일 대응
 * 웹은 병합된 `StyledCellOverlay[]` 하나를 받아 **색 없는 셀(점령·강조 전용)만** 걷고
 * **테마 색 보유 셀(칩 대상)은 저줌에서도 남긴다** (MSG-403 AC 7 — 칩은 축척 500m·1km로
 * 줌아웃한 화면에서 데이터를 보여주는 것이 목적이라, 여기서 걷히면 그 줌에서 축제 타일·
 * 코스 라인 주변 격자가 통째로 사라지고 집계 마커로는 영역 모양이 안 읽힌다).
 * 모바일은 같은 셀을 prop 4개로 쪼개 지도에 넘기므로, 그 판별자가 **"어느 층인가"로
 * 자연 표현된다**:
 * - `occupiedCells` = 색 없음 → 게이트 대상
 * - `themeCells`·`hatchCells`·`route` = 테마 색 보유 → 게이트 안 함(저줌에서도 남는다)
 *
 * 이 대응이 웹 판정과 동치임은 `cluster-overlay.parity.test.ts`가 웹 원본을 동적 import해
 * 전건 대조로 고정한다.
 *
 * ## 판정과 적용의 분리 (재작업 2회차)
 * 게이트 입력은 연속값 zoom이 아니라 **임계 통과 여부(불리언)** 다. 지도 컴포넌트는
 * `isBelowGridZoom(camera.zoom)`의 결과만 상태로 들기 때문에, 핀치 중 프레임마다 값이
 * 같으면 `Object.is` 동일성으로 리렌더가 건너뛰어지고 상태는 임계를 실제로 넘는 순간에만
 * 바뀐다(MSG-423이 "매 프레임 부모 setState" 때문에 디바운스를 기각한 것과 같은 함정 회피).
 * 판정 자체는 여전히 카메라 콜백 안에서 **그 이벤트의 zoom**으로 하므로 격자선 층과
 * 어긋나지 않는다.
 */

/** 지도 채움 층 — 웹 병합 목록의 색 유무를 대신하는 모바일 판별 축 */
export type FillLayer = "occupied" | "theme" | "hatch" | "route";

/** 저줌에서 걷히는 층인가 — 웹 `cell.color === undefined`와 동치 */
export const isZoomGatedLayer = (layer: FillLayer): boolean =>
  layer === "occupied";

/**
 * 채움이 걷히는 줌인가 — 게이트의 유일한 임계 판정자.
 * 화면에서 `zoom < GRID_MIN_ZOOM`을 인라인으로 쓰지 않고 이 함수만 부른다(임계 단일 출처).
 * zoom이 NaN이면 비교가 거짓이라 저줌으로 판정된다 — 웹 `gateFillCells`와 동일.
 */
export const isBelowGridZoom = (zoom: number): boolean =>
  !(zoom >= GRID_MIN_ZOOM);

/** 걷힌 결과의 고정 참조 — 저줌 렌더마다 새 배열을 만들지 않는다 */
const NO_CELLS: readonly GridCellIndex[] = [];

/**
 * 점령 채움 셀 줌 게이트 — 저줌 판정(`isBelowGridZoom`)이 거짓일 때만 그대로 통과시킨다.
 * 테마 층에는 적용하지 않는다(위 대응표).
 */
export const gateOccupiedFill = (
  cells: readonly GridCellIndex[] | undefined,
  belowGridZoom: boolean,
): readonly GridCellIndex[] => (belowGridZoom ? NO_CELLS : (cells ?? NO_CELLS));
