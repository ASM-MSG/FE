/**
 * 온보딩 3장의 문구 데이터 + 장 인덱스 파생 (MSG-421 → MSG-590 L1~L3).
 * SOURCE: Figma 미리보기 · 온보딩 1/2/3 (시안 적용) (node 14902:476 / 14902:581 / 14902:626) — 문구는 조회 원문.
 *
 * 뷰·라우터 import 없는 순수 모델 — 화면(onboarding-screen)은 이 파생만 소비하고
 * 분기 로직을 갖지 않는다. apps/mobile vitest가 실행하는 유일한 계층이다(MSG-292 확정 4).
 */

/** 장 식별자 — 일러스트 선택에 쓴다 */
export type OnboardingStepId = "fill" | "record" | "explore";

export interface OnboardingStepContent {
  id: OnboardingStepId;
  /** 헤드라인 2줄 — 줄바꿈 위치까지 Figma를 따른다 */
  headlineLines: readonly [string, string];
  /** 설명 2줄 — 줄바꿈 위치까지 Figma를 따른다 (MSG-590) */
  descriptionLines: readonly [string, string];
}

export const ONBOARDING_STEPS: readonly OnboardingStepContent[] = [
  {
    id: "fill",
    headlineLines: ["우리 동네를 격자로", "하나씩 채워가요"],
    descriptionLines: [
      "방문한 곳이 격자 위에 색으로 남아",
      "나만의 지도가 완성돼요",
    ],
  },
  {
    id: "record",
    headlineLines: ["짧은 영상으로", "이 순간을 남겨요"],
    descriptionLines: [
      "머문 장소에서 짧은 영상을 기록하면",
      "그날의 기억이 오래도록 남아요",
    ],
  },
  {
    id: "explore",
    headlineLines: ["지금 뜨는 동네를", "지도에서 찾아봐요"],
    descriptionLines: [
      "핫구역과 인기 장소를 살펴보며",
      "다음 탐험지를 정해보세요",
    ],
  },
] as const;

const lastIndex = ONBOARDING_STEPS.length - 1;

/** 마지막 장만 "시작하기", 나머지는 "다음" (L1) */
export const ctaLabelOf = (index: number): string =>
  index >= lastIndex ? "시작하기" : "다음";

/** CTA 동작 파생 — 다음 장 인덱스이거나 완료 (L2) */
export const nextActionOf = (index: number): number | "done" =>
  index >= lastIndex ? "done" : index + 1;
