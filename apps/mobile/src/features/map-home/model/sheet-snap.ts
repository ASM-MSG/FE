/**
 * 4단계 드래그 바텀시트의 단계 위치·스냅 판정 (AC 11·18, D9) — 순수 모델.
 * 좌표계: 시트 컨테이너(지도 영역, 바텀 내비 바 위) 상단 기준 시트 상단의 y(px).
 * 단계 번호가 낮을수록 시트가 펼쳐진 상태(작은 y)다.
 * 속도 가중 없는 위치 최근접이 고정 동작(스펙) — 속도 반영은 필요해질 때 확장.
 */

/** 시트 단계 — 1=전체 확장, 2=절반, 3=피크, 4=완전 숨김 (스펙 "시트 단계 정의") */
export type SheetStage = 1 | 2 | 3 | 4;

export const SHEET_STAGES = [1, 2, 3, 4] as const;

/** 1단계(전체 확장)에서 상단에 남기는 지도 비율 — "화면 거의 전체, 상단에 지도 살짝" */
export const FULL_TOP_RATIO = 0.1;

/** 2단계(절반) — 시트가 컨테이너 절반 */
export const HALF_TOP_RATIO = 0.5;

/**
 * 3단계(피크) 시트 노출 높이(px) — 4차: 콘텐츠 통일(AC 10)로 통일 콘텐츠의
 * 상단(헤더 "서면 격자"·정렬 칩)까지 보이는 수준. 상단 패딩(10) + 핸들(4) + gap(12)
 * + 헤더(19) + gap(12) + 정렬 칩(32) = 89 + 하단 여유(15).
 */
export const PEEK_HEIGHT = 104;

/** 단계별 시트 상단 y 위치 — 컨테이너 높이에서 파생 */
export type SheetPositions = Record<SheetStage, number>;

export const sheetStagePositions = (
  containerHeight: number,
): SheetPositions => ({
  1: containerHeight * FULL_TOP_RATIO,
  2: containerHeight * HALF_TOP_RATIO,
  3: containerHeight - PEEK_HEIGHT,
  4: containerHeight,
});

/**
 * 릴리즈 위치의 최근접 단계 판정 (AC 18) — 거리가 같은 중간값에서는
 * 더 펼쳐진(번호가 낮은) 단계를 반환한다 (결정적 동작).
 */
export const snapStage = (
  releaseY: number,
  positions: SheetPositions,
): SheetStage =>
  SHEET_STAGES.reduce((nearest, stage) =>
    Math.abs(positions[stage] - releaseY) <
    Math.abs(positions[nearest] - releaseY)
      ? stage
      : nearest,
  );
