import { describe, expect, it } from "vitest";
import {
  ONBOARDING_STEPS,
  ctaLabelOf,
  isSkipVisible,
  nextActionOf,
  progressOf,
} from "./onboarding-steps";

/**
 * 테스트 템플릿 ① 순수 로직 — 장 인덱스(입력) → 화면 파생값(출력) 계산이 검증 대상이다.
 * 뷰 렌더는 대상이 아니다(apps/mobile vitest는 RN import 없는 순수 모델만 실행 — MSG-292 확정 4).
 */
describe("온보딩 장 파생 모델 (MSG-421 L1~L5)", () => {
  it("장 인덱스 0·1의 CTA 라벨은 '다음', 인덱스 2는 '시작하기'다 (L1)", () => {
    expect(ctaLabelOf(0)).toBe("다음");
    expect(ctaLabelOf(1)).toBe("다음");
    expect(ctaLabelOf(2)).toBe("시작하기");
  });

  it("건너뛰기 노출 판정은 인덱스 0·1에서 true, 2에서 false다 (L2)", () => {
    expect(isSkipVisible(0)).toBe(true);
    expect(isSkipVisible(1)).toBe(true);
    expect(isSkipVisible(2)).toBe(false);
  });

  it("진행바 파생은 모든 장에서 total=3이고 current는 인덱스+1이다 (L3)", () => {
    expect(progressOf(0)).toEqual({ total: 3, current: 1 });
    expect(progressOf(1)).toEqual({ total: 3, current: 2 });
    expect(progressOf(2)).toEqual({ total: 3, current: 3 });
  });

  it("CTA 동작 파생은 인덱스 0·1에서 다음 장 인덱스, 인덱스 2에서 'done'이다 (L4)", () => {
    expect(nextActionOf(0)).toBe(1);
    expect(nextActionOf(1)).toBe(2);
    expect(nextActionOf(2)).toBe("done");
  });

  it("3개 장의 헤드라인 2줄·설명 1줄이 Figma 원문 문자열과 일치한다 (L5)", () => {
    expect(
      ONBOARDING_STEPS.map((step) => [...step.headlineLines, step.description]),
    ).toEqual([
      [
        "우리 동네를 격자로",
        "하나씩 채워가요",
        "방문한 곳이 지도 위에 색으로 남아요",
      ],
      [
        "짧은 영상 하나로",
        "그 순간을 남겨요",
        "AI가 가장 좋은 구간을 골라줘요",
      ],
      [
        "핫한 구역과 축제를",
        "지도에서 찾아봐요",
        "미션을 채우면 뱃지가 쌓여요",
      ],
    ]);
  });
});
