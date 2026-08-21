import { describe, expect, it } from "vitest";
import {
  isDexInitial,
  isHomeInitial,
  isProfileInitial,
  railReclickAction,
} from "./rail-action";

const HOME_INITIAL = {
  activeTheme: null,
  selectedGridId: null,
  selectedMissionId: null,
  miniPanelOpen: false,
  regionMode: "grids",
} as const;

describe("isHomeInitial — 홈 초기 상태 판정 (AC 16)", () => {
  it("칩·상세·미니 패널이 모두 닫히고 격자 리스트 모드면 초기 상태다 (AC 16)", () => {
    expect(isHomeInitial(HOME_INITIAL)).toBe(true);
  });

  it("칩이 켜져 있으면 초기 상태가 아니다 (AC 16)", () => {
    expect(isHomeInitial({ ...HOME_INITIAL, activeTheme: "hot" })).toBe(false);
  });

  it("격자 상세·미션 상세·미니 패널·전체 지역 리스트 중 하나라도 열려 있으면 초기 상태가 아니다 (AC 16)", () => {
    expect(
      isHomeInitial({ ...HOME_INITIAL, selectedGridId: "39064_112221" }),
    ).toBe(false);
    expect(isHomeInitial({ ...HOME_INITIAL, selectedMissionId: 12 })).toBe(
      false,
    );
    expect(isHomeInitial({ ...HOME_INITIAL, miniPanelOpen: true })).toBe(false);
    expect(isHomeInitial({ ...HOME_INITIAL, regionMode: "regions" })).toBe(
      false,
    );
  });
});

describe("isDexInitial — 도감 초기 상태 판정 (AC 16)", () => {
  it("지도 탭이고 동 갤러리에 들어가지 않았으면 초기 상태다 (AC 16)", () => {
    expect(isDexInitial({ tab: "map", galleryOpen: false })).toBe(true);
  });

  it("뱃지 탭이거나 동 갤러리를 열었으면 초기 상태가 아니다 (AC 16)", () => {
    expect(isDexInitial({ tab: "badges", galleryOpen: false })).toBe(false);
    expect(isDexInitial({ tab: "map", galleryOpen: true })).toBe(false);
  });
});

describe("isProfileInitial — 프로필 초기 상태 판정 (AC 16)", () => {
  it("열린 모달이 없으면 초기 상태다 (AC 16)", () => {
    expect(isProfileInitial({ modalOpen: false })).toBe(true);
  });

  it("프로필 편집·계정 삭제 모달이 열려 있으면 초기 상태가 아니다 (AC 16)", () => {
    expect(isProfileInitial({ modalOpen: true })).toBe(false);
  });
});

describe("railReclickAction — 활성 탭 재클릭 동작 (AC 16)", () => {
  it("초기 상태가 아니면 먼저 초기화한다 — 패널은 닫지 않는다 (AC 16)", () => {
    expect(railReclickAction(false)).toBe("reset");
  });

  it("이미 초기 상태면 패널 접기/펼치기를 토글한다 (AC 16)", () => {
    expect(railReclickAction(true)).toBe("toggle");
  });
});
