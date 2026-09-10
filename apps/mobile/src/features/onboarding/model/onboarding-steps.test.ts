import { describe, expect, it } from "vitest";
import { ONBOARDING_STEPS, ctaLabelOf, nextActionOf } from "./onboarding-steps";

/**
 * 테스트 템플릿 ① 순수 로직 — 장 인덱스(입력) → 화면 파생값(출력) 계산이 검증 대상이다.
 * 뷰 렌더는 대상이 아니다(apps/mobile vitest는 RN import 없는 순수 모델만 실행 — MSG-292 확정 4).
 */
describe("온보딩 장 파생 모델 (MSG-590 L1~L3)", () => {
  it("장 인덱스 0·1의 CTA 라벨은 '다음', 인덱스 2는 '시작하기'다 (L1)", () => {
    expect(ctaLabelOf(0)).toBe("다음");
    expect(ctaLabelOf(1)).toBe("다음");
    expect(ctaLabelOf(2)).toBe("시작하기");
  });

  it("CTA 동작 파생은 인덱스 0·1에서 다음 장 인덱스, 인덱스 2에서 'done'이다 (L2)", () => {
    expect(nextActionOf(0)).toBe(1);
    expect(nextActionOf(1)).toBe(2);
    expect(nextActionOf(2)).toBe("done");
  });

  it("3개 장의 헤드라인 2줄·설명 2줄이 시안 원문 문자열과 줄바꿈 위치까지 일치한다 (L3)", () => {
    expect(
      ONBOARDING_STEPS.map((step) => [
        ...step.headlineLines,
        ...step.descriptionLines,
      ]),
    ).toEqual([
      [
        "우리 동네를 격자로",
        "하나씩 채워가요",
        "방문한 곳이 격자 위에 색으로 남아",
        "나만의 지도가 완성돼요",
      ],
      [
        "짧은 영상으로",
        "이 순간을 남겨요",
        "머문 장소에서 짧은 영상을 기록하면",
        "그날의 기억이 오래도록 남아요",
      ],
      [
        "지금 뜨는 동네를",
        "지도에서 찾아봐요",
        "핫구역과 인기 장소를 살펴보며",
        "다음 탐험지를 정해보세요",
      ],
    ]);
  });
});
