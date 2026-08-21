import { describe, expect, it } from "vitest";
import {
  MIN_RELOAD_ZOOM,
  deriveReloadTarget,
  reloadLabel,
  shouldShowReload,
} from "./region-reload";
import { scaleLabelForZoom } from "@/features/map-home/model/map-scale";

/** 격자가 보이는 기본 줌 — 상한(2km)보다 확대된 상태 */
const ZOOMED_IN = 16;

describe("shouldShowReload — 재검색 버튼 노출 판정 (AC 8)", () => {
  it("표시 중 행정동과 현재 중심 행정동이 다르면 노출한다", () => {
    expect(shouldShowReload("2644056000", "2644057000", ZOOMED_IN)).toBe(true);
  });

  it("표시 중 행정동과 현재 중심 행정동이 같으면 노출하지 않는다", () => {
    expect(shouldShowReload("2644056000", "2644056000", ZOOMED_IN)).toBe(false);
  });

  it("표시 중 행정동이 아직 없으면(최초 진입) 노출하지 않는다 (경계)", () => {
    expect(shouldShowReload(null, "2644056000", ZOOMED_IN)).toBe(false);
  });

  it("현재 중심이 행정동 밖(null)이면 노출하지 않는다 — 불러올 대상이 없다 (AC 12 연동)", () => {
    expect(shouldShowReload("2644056000", null, ZOOMED_IN)).toBe(false);
  });
});

describe("shouldShowReload — 줌 상한 (사용자 요청: 축척 2km까지만 불러오기)", () => {
  it("상한 줌은 축척 2km가 보이는 단이다", () => {
    expect(scaleLabelForZoom(MIN_RELOAD_ZOOM)).toBe("2km");
  });

  it("축척 2km 단에서는 노출한다 — 경계 포함", () => {
    expect(shouldShowReload("2644056000", "2644057000", MIN_RELOAD_ZOOM)).toBe(
      true,
    );
  });

  it("2km보다 더 줌아웃하면 노출하지 않는다 — 그 범위는 불러오지 않는다", () => {
    expect(
      shouldShowReload("2644056000", "2644057000", MIN_RELOAD_ZOOM - 1),
    ).toBe(false);
    expect(
      shouldShowReload("2644056000", "2644057000", MIN_RELOAD_ZOOM - 3),
    ).toBe(false);
  });
});

describe("reloadLabel — 버튼 라벨 조합 (AC 8)", () => {
  it("'{행정동} 장소 불러오기'로 조합한다", () => {
    expect(reloadLabel("부전제1동")).toBe("부전제1동 장소 불러오기");
  });
});

describe("deriveReloadTarget — 버튼 대상 파생 (MSG-403 리뷰 반영)", () => {
  const BASE = {
    isThemeDetailPanel: false,
    isGridListMode: true,
    committedRegionCode: "2644056000",
    currentRegion: { regionCode: "2644057000", regionName: "부전제2동" },
    zoom: ZOOMED_IN,
  };

  it("목록 화면에서 확정 지역과 다른 동에 있으면 그 동이 대상이다", () => {
    expect(deriveReloadTarget(BASE)?.regionName).toBe("부전제2동");
  });

  it("미션·코스 상세와 전체 지역 리스트에서는 대상이 없다 — 갱신할 목록이 화면에 없다", () => {
    expect(
      deriveReloadTarget({ ...BASE, isThemeDetailPanel: true }),
    ).toBeNull();
    expect(deriveReloadTarget({ ...BASE, isGridListMode: false })).toBeNull();
  });

  it("줌 상한·지역 상이 판정은 상세 여부와 무관하게 그대로다 (MSG-451 AC 16)", () => {
    expect(
      deriveReloadTarget({ ...BASE, zoom: MIN_RELOAD_ZOOM - 1 }),
    ).toBeNull();
    expect(
      deriveReloadTarget({ ...BASE, committedRegionCode: "2644057000" }),
    ).toBeNull();
  });

  it("축척 2km보다 넓게 줌아웃하면 대상이 없다", () => {
    expect(
      deriveReloadTarget({ ...BASE, zoom: MIN_RELOAD_ZOOM - 1 }),
    ).toBeNull();
  });
});
