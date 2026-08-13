import { describe, expect, it } from "vitest";
import { headerRegionName } from "./region-header";

describe("headerRegionName — 패널 헤더 표시명 선택 (사용자 보완 — 헤더 라이브 동기화)", () => {
  it("현재 중심 컨텍스트(auto)에서는 지도 이동에 따라 현재 행정동명을 즉시 보여준다", () => {
    expect(headerRegionName("부전제1동", "부전제2동", "auto")).toBe(
      "부전제2동",
    );
  });

  it("auto인데 현재 중심이 행정동 밖(null)이거나 미도착이면 직전 표시 지역명을 유지한다", () => {
    expect(headerRegionName("부전제1동", null, "auto")).toBe("부전제1동");
  });

  it("전체 보기에서 지역을 명시 선택(manual)했으면 지도 이동과 무관하게 선택 지역명이 정본이다", () => {
    expect(headerRegionName("부전제1동", "부전제2동", "manual")).toBe(
      "부전제1동",
    );
  });
});
