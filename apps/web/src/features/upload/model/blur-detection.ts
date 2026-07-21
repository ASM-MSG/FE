/**
 * AI 자동 블러 감지 — 목업 데이터·집계·문구 순수 로직 (MSG-119 L3~L7).
 * 플랫폼 API(window·File·DOM 등)를 참조하지 않는다 — 좌표·수치·문자열만 다루므로 RN 재사용 대상.
 * 실제 AI 감지·블러 처리 API 연동은 범위 밖 — 감지 영역·완료 문구는 목업이다.
 */

/** 감지 영역 종류 — 얼굴 또는 번호판. */
export type BlurRegionKind = "face" | "plate";

/** 오버레이 위치 — 미리보기 대비 % 좌표 (Q3, 하드코딩 근사). */
export interface BlurBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 감지 영역 — 종류·라벨·오버레이 위치. */
export interface BlurRegion {
  id: string;
  kind: BlurRegionKind;
  label: string;
  box: BlurBox;
}

/** 감지 요약 — 얼굴 수·번호판 수. */
export interface BlurSummary {
  faces: number;
  plates: number;
}

/** 확인 결과 payload — 콘솔 로그용 (Q4). */
export interface BlurConfirmResult {
  summary: BlurSummary;
  duration: number;
}

/** 종류별 라벨 접두어. */
const KIND_LABEL: Record<BlurRegionKind, string> = {
  face: "얼굴",
  plate: "번호판",
};

/**
 * 목업 감지 영역 시드 — 기본 얼굴 2개·번호판 1개.
 * box는 미리보기 대비 % 좌표 하드코딩(Q3, Figma 배치 근사) — 실제 감지가 아니므로 고정 위치.
 */
const MOCK_REGION_SEED: readonly { kind: BlurRegionKind; box: BlurBox }[] = [
  { kind: "face", box: { x: 20, y: 24, w: 18, h: 26 } },
  { kind: "face", box: { x: 58, y: 20, w: 17, h: 24 } },
  { kind: "plate", box: { x: 37, y: 63, w: 27, h: 15 } },
];

/**
 * 목업 감지 영역을 생성한다 — 기본 얼굴 2개·번호판 1개, 총 3개. [L3·L4]
 * 라벨은 종류별로 1부터 번호가 매겨진다("얼굴 1", "얼굴 2", "번호판 1").
 */
export const buildMockBlurRegions = (): BlurRegion[] => {
  const counters: Record<BlurRegionKind, number> = { face: 0, plate: 0 };
  return MOCK_REGION_SEED.map((seed, index) => {
    counters[seed.kind] += 1;
    return {
      id: `blur-${index + 1}`,
      kind: seed.kind,
      label: `${KIND_LABEL[seed.kind]} ${counters[seed.kind]}`,
      box: seed.box,
    };
  });
};

/** 감지 영역을 얼굴 수·번호판 수로 집계한다. [L5] */
export const summarizeBlurRegions = (regions: BlurRegion[]): BlurSummary => ({
  faces: regions.filter((region) => region.kind === "face").length,
  plates: regions.filter((region) => region.kind === "plate").length,
});

/** 집계 기준 완료 문구를 반환한다. [L6] */
export const formatBlurCompletion = (summary: BlurSummary): string =>
  `AI 자동 블러 완료 — 얼굴 ${summary.faces}개, 번호판 ${summary.plates}개를 자동으로 가렸어요`;

/** 확인 결과 payload — 감지 요약과 영상 길이(초)를 담는다. [L7·Q4] */
export const toBlurConfirmResult = (
  summary: BlurSummary,
  duration: number,
): BlurConfirmResult => ({ summary, duration });
