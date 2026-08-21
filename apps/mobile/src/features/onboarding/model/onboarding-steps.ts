/**
 * 온보딩 3장의 문구 데이터 + 장 인덱스 파생 (MSG-421 L1~L5).
 * SOURCE: Figma 온보딩 v2 · 1~3 (node 14875:430 / 14875:442 / 14875:454) — 문구는 조회 원문.
 *
 * 뷰·라우터 import 없는 순수 모델 — 화면(onboarding-screen)은 이 파생만 소비하고
 * 분기 로직을 갖지 않는다. apps/mobile vitest가 실행하는 유일한 계층이다(MSG-292 확정 4).
 */

/** 장 식별자 — 히어로 카드 선택에 쓴다 */
export type OnboardingStepId = "fill" | "record" | "explore";

export interface OnboardingStepContent {
  id: OnboardingStepId;
  /** 헤드라인 2줄 — 줄바꿈 위치까지 Figma를 따른다 */
  headlineLines: readonly [string, string];
  /** 설명 1줄 */
  description: string;
}

export const ONBOARDING_STEPS: readonly OnboardingStepContent[] = [
  {
    id: "fill",
    headlineLines: ["우리 동네를 격자로", "하나씩 채워가요"],
    description: "방문한 곳이 지도 위에 색으로 남아요",
  },
  {
    id: "record",
    headlineLines: ["짧은 영상 하나로", "그 순간을 남겨요"],
    description: "AI가 가장 좋은 구간을 골라줘요",
  },
  {
    id: "explore",
    headlineLines: ["핫한 구역과 축제를", "지도에서 찾아봐요"],
    description: "미션을 채우면 뱃지가 쌓여요",
  },
] as const;

const lastIndex = ONBOARDING_STEPS.length - 1;

/** 마지막 장만 "시작하기", 나머지는 "다음" (L1) */
export const ctaLabelOf = (index: number): string =>
  index >= lastIndex ? "시작하기" : "다음";

/** 마지막 장에는 건너뛰기가 없다 (L2) */
export const isSkipVisible = (index: number): boolean => index < lastIndex;

/** 상단 진행바 파생 — SegmentedProgress의 total/current와 1:1 (L3) */
export const progressOf = (
  index: number,
): { total: number; current: number } => ({
  total: ONBOARDING_STEPS.length,
  current: index + 1,
});

/** CTA 동작 파생 — 다음 장 인덱스이거나 완료 (L4) */
export const nextActionOf = (index: number): number | "done" =>
  index >= lastIndex ? "done" : index + 1;
