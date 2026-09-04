import { describe, expect, it } from "vitest";
import { LOAD_MORE_THRESHOLD_PX, isNearScrollEnd } from "./scroll-end";

/**
 * MSG-571 AC 8: 목록 스크롤이 끝에 근접(임계 `LOAD_MORE_THRESHOLD_PX`)하면 이어받기를
 * 부른다 — 웹 sentinel(1px) 대신 스크롤 이벤트 지표로 판정한다.
 */
const metrics = (offsetY: number, viewport = 600, content = 2000) => ({
  contentOffset: { y: offsetY },
  layoutMeasurement: { height: viewport },
  contentSize: { height: content },
});

describe("isNearScrollEnd — 스크롤 끝 근접 판정 (AC 8)", () => {
  it("임계는 80px이다 (추정 5)", () => {
    expect(LOAD_MORE_THRESHOLD_PX).toBe(80);
  });

  it("남은 거리가 임계 이하면 끝 근접이다 (경계 포함)", () => {
    expect(isNearScrollEnd(metrics(1320), 80)).toBe(true);
    expect(isNearScrollEnd(metrics(1400), 80)).toBe(true);
  });

  it("남은 거리가 임계보다 크면 끝 근접이 아니다", () => {
    expect(isNearScrollEnd(metrics(1319), 80)).toBe(false);
    expect(isNearScrollEnd(metrics(0), 80)).toBe(false);
  });

  it("콘텐츠가 뷰포트보다 짧으면(스크롤 불가) 끝 근접이다 — 첫 페이지가 화면을 못 채워도 이어받는다", () => {
    expect(isNearScrollEnd(metrics(0, 600, 300), 80)).toBe(true);
  });
});
