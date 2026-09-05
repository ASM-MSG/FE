import { spacing, typography } from "@fillmap/design-tokens";
import { describe, expect, it } from "vitest";
import {
  ASCII_WIDTH_RATIO,
  SHADOW_BLEED,
  clusterBubbleSize,
} from "./cluster-bubble-size";

/**
 * MSG-558 L1~L3: 말풍선 마커 박스 크기 추정 — RN 마커는 width/height가 필수인데 텍스트
 * 실측(onLayout)은 첫 프레임에 못 쓰므로 순수 추정으로 간다. 폭은 과대 방향(잘림만 막는다).
 * 웹 실측 표본은 프로덕션(fillmap.kr)에 웹 클래스 문자열 그대로 주입해 잰 값이다 —
 * "부전2동/27"→62.5, "부산진구/342"→65.5, "부산광역시/1,284"→75.9 (높이 48 동일),
 * 이름 없는 버킷은 "58"→44.4, "124,876"→85.8 (높이 33).
 */
describe("clusterBubbleSize — 말풍선 크기 추정 (L1~L3)", () => {
  it("name 있는 마커의 말풍선 높이는 48(6 + label 15 + heading 20 + 7)이다 (L1)", () => {
    const { bubble } = clusterBubbleSize({ name: "부전2동", count: 118 });

    expect(bubble.height).toBe(48);
    expect(bubble.height).toBe(
      6 + typography.label.lineHeight + typography.heading.lineHeight + 7,
    );
  });

  it("name === null 마커(병합·미판정)의 말풍선 높이는 33(6 + heading 20 + 7)이다 (L1)", () => {
    const { bubble } = clusterBubbleSize({ name: null, count: 5 });

    expect(bubble.height).toBe(33);
  });

  it("폭은 2×spacing.sm + max(지역명 폭, 개수 폭)이고 지역명 글자 수에 단조 증가한다 (L1)", () => {
    const short = clusterBubbleSize({ name: "부산", count: 1 }).bubble.width;
    const mid = clusterBubbleSize({ name: "부산진구", count: 1 }).bubble.width;
    const long = clusterBubbleSize({ name: "부산진구제1동", count: 1 }).bubble
      .width;

    expect(short).toBeLessThan(mid);
    expect(mid).toBeLessThan(long);
    // 한글 4자 × label 12 = 48이 개수 "1"(0.6×16)보다 넓다 → 48 + 2×12
    expect(mid).toBe(2 * spacing.sm + 4 * typography.label.fontSize);
  });

  it("개수 줄이 지역명보다 넓으면 개수 폭이 말풍선 폭을 정한다 — '1,234' 5자 (L1)", () => {
    const { bubble } = clusterBubbleSize({ name: null, count: 1234 });

    expect(bubble.width).toBe(
      2 * spacing.sm +
        Math.ceil(5 * ASCII_WIDTH_RATIO * typography.heading.fontSize),
    );
  });

  it("폭 추정은 웹 실측 표본보다 작지 않다 — 과소 추정 금지 (L2)", () => {
    expect(
      clusterBubbleSize({ name: "부전2동", count: 118 }).bubble.width,
    ).toBeGreaterThanOrEqual(63);
    expect(
      clusterBubbleSize({ name: "부산진구", count: 214 }).bubble.width,
    ).toBeGreaterThanOrEqual(66);
    expect(
      clusterBubbleSize({ name: "부산광역시", count: 1284 }).bubble.width,
    ).toBeGreaterThanOrEqual(76);
    // 이름 없는 버킷 + 콤마 없는 개수 — ASCII 계수가 0.6이면 44로 실측(44.4)에 미달했다
    expect(
      clusterBubbleSize({ name: null, count: 58 }).bubble.width,
    ).toBeGreaterThanOrEqual(45);
    expect(
      clusterBubbleSize({ name: null, count: 124876 }).bubble.width,
    ).toBeGreaterThanOrEqual(86);
  });

  it("마커 박스는 말풍선에 그림자 번짐 여백(SHADOW_BLEED)을 양쪽에 더한 값이다 (L3)", () => {
    const { bubble, box } = clusterBubbleSize({ name: "부전2동", count: 118 });

    expect(box.width).toBe(bubble.width + 2 * SHADOW_BLEED);
    expect(box.height).toBe(bubble.height + 2 * SHADOW_BLEED);
  });
});
