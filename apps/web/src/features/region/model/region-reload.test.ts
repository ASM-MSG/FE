import { describe, expect, it } from "vitest";
import { reloadLabel, shouldShowReload } from "./region-reload";

describe("shouldShowReload — 재검색 버튼 노출 판정 (AC 8)", () => {
  it("표시 중 행정동과 현재 중심 행정동이 다르면 노출한다", () => {
    expect(shouldShowReload("2644056000", "2644057000")).toBe(true);
  });

  it("표시 중 행정동과 현재 중심 행정동이 같으면 노출하지 않는다", () => {
    expect(shouldShowReload("2644056000", "2644056000")).toBe(false);
  });

  it("표시 중 행정동이 아직 없으면(최초 진입) 노출하지 않는다 (경계)", () => {
    expect(shouldShowReload(null, "2644056000")).toBe(false);
  });

  it("현재 중심이 행정동 밖(null)이면 노출하지 않는다 — 불러올 대상이 없다 (AC 12 연동)", () => {
    expect(shouldShowReload("2644056000", null)).toBe(false);
  });
});

describe("reloadLabel — 버튼 라벨 조합 (AC 8)", () => {
  it("'{행정동} 장소 불러오기'로 조합한다", () => {
    expect(reloadLabel("부전제1동")).toBe("부전제1동 장소 불러오기");
  });
});
