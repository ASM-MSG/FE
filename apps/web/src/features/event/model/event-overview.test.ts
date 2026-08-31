import { describe, expect, it } from "vitest";
import type { EventLocationResponseDto } from "@/shared/api/generated/types.gen";
import {
  eventPeriodLabel,
  locationTypeLabel,
  toLocationCardViews,
  viewerCountLabel,
} from "./event-overview";

const LOCATION_DTO: EventLocationResponseDto = {
  locationId: 11,
  name: "부산역 웰컴 팝업",
  type: "POPUP",
  operatingHours: "10:00–20:00",
  gridIds: ["16846_11428", "16846_11429"],
  representativeGridId: "16846_11428",
  zoneName: null,
  zoneCell: null,
  regionName: "부전2동",
  videoCount: 12,
  organizerName: null,
  description: null,
  participationStartsOn: null,
  participationEndsOn: null,
  participationMethod: null,
  imageUrl: "https://cdn.example.com/popup.png",
};

describe("eventPeriodLabel — KST 'M.D–M.D' 기간 라벨 (AC 1)", () => {
  it("시작·종료의 KST 날짜부를 'M.D–M.D'로 잇는다", () => {
    expect(eventPeriodLabel("2026-07-17T10:00:00", "2026-08-09T21:00:00")).toBe(
      "7.17–8.9",
    );
  });

  it("오프셋(Z)이 붙은 시각은 KST로 환산한 날짜를 쓴다 (경계 — UTC 15시 = KST 익일)", () => {
    expect(
      eventPeriodLabel("2026-07-16T15:00:00Z", "2026-08-08T15:00:00Z"),
    ).toBe("7.17–8.9");
  });
});

describe("viewerCountLabel — 시청 인원 라벨 (AC 3·4)", () => {
  it("0은 숨기지 않고 '0명 보는 중'으로 표시한다 (AC 3)", () => {
    expect(viewerCountLabel(0)).toBe("0명 보는 중");
  });

  it("N명이면 'N명 보는 중'이다 (AC 3)", () => {
    expect(viewerCountLabel(120)).toBe("120명 보는 중");
  });

  it("null(캐시 장애·조회 실패)은 라벨 없음 — 표시만 생략한다 (AC 4)", () => {
    expect(viewerCountLabel(null)).toBeNull();
  });
});

describe("locationTypeLabel — 위치 유형 라벨 매핑 (AC 9)", () => {
  it("서버 enum 5종을 한글 라벨로 옮긴다", () => {
    expect(locationTypeLabel("POPUP")).toBe("팝업");
    expect(locationTypeLabel("EXPERIENCE_ZONE")).toBe("체험존");
    expect(locationTypeLabel("PARADE")).toBe("퍼레이드");
    expect(locationTypeLabel("PHOTO_ZONE")).toBe("포토존");
    expect(locationTypeLabel("ETC")).toBe("기타");
  });
});

describe("toLocationCardViews — 위치 카드 뷰 파생 (AC 9)", () => {
  it("유형 라벨 · 운영시간을 '·'로 잇고 '영상 N' 배지·이미지를 담는다", () => {
    const [card] = toLocationCardViews([LOCATION_DTO]);

    expect(card).toEqual({
      locationId: 11,
      name: "부산역 웰컴 팝업",
      meta: "팝업 · 10:00–20:00",
      videoBadge: "영상 12",
      imageUrl: "https://cdn.example.com/popup.png",
    });
  });

  it("operatingHours가 null이면 메타에서 생략한다 — 유형 라벨만 남는다 (AC 9)", () => {
    const [card] = toLocationCardViews([
      { ...LOCATION_DTO, type: "PHOTO_ZONE", operatingHours: null },
    ]);

    expect(card?.meta).toBe("포토존");
  });

  it("빈 목록은 빈 배열이다 (경계)", () => {
    expect(toLocationCardViews([])).toEqual([]);
  });
});
