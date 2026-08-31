import { describe, expect, it } from "vitest";
import type { EventLocationResponseDto } from "@/shared/api/generated/types.gen";
import {
  eventLocationGridNotice,
  eventLocationMetaLine,
  eventLocationSectionTitle,
  eventLocationTypeLabel,
  toEventLocationSelection,
} from "./event-location";

const locationDto = (
  over: Partial<EventLocationResponseDto> = {},
): EventLocationResponseDto => ({
  locationId: 4,
  name: "광안리 피카츄 퍼레이드",
  type: "PARADE",
  operatingHours: "19:00~20:00",
  gridIds: ["39064_112221", "39064_112222", "39065_112221", "39065_112222"],
  representativeGridId: "39064_112221",
  zoneName: null,
  zoneCell: null,
  regionName: "광안동",
  videoCount: 34,
  organizerName: null,
  description: null,
  participationStartsOn: null,
  participationEndsOn: null,
  participationMethod: null,
  imageUrl: null,
  ...over,
});

describe("toEventLocationSelection — 위치 DTO → 선택 스냅숏 변환 (AC 1)", () => {
  it("선택에 필요한 필드만 스냅숏으로 뽑고 격자 수는 gridIds 길이로 센다 (AC 1·4)", () => {
    expect(toEventLocationSelection(locationDto())).toEqual({
      locationId: 4,
      name: "광안리 피카츄 퍼레이드",
      type: "PARADE",
      operatingHours: "19:00~20:00",
      gridCount: 4,
      videoCount: 34,
    });
  });
});

describe("eventLocationTypeLabel — 위치 유형 한글 라벨 (AC 3)", () => {
  it("서버 유형 5종을 전부 한글로 변환한다 (AC 3)", () => {
    expect(eventLocationTypeLabel("POPUP")).toBe("팝업");
    expect(eventLocationTypeLabel("EXPERIENCE_ZONE")).toBe("체험존");
    expect(eventLocationTypeLabel("PARADE")).toBe("퍼레이드");
    expect(eventLocationTypeLabel("PHOTO_ZONE")).toBe("포토존");
    expect(eventLocationTypeLabel("ETC")).toBe("기타");
  });
});

describe("eventLocationMetaLine — 헤더 메타 줄 조합 (AC 3)", () => {
  it('운영 시간이 있으면 "영상 N · 시간"으로 잇는다 (AC 3)', () => {
    expect(eventLocationMetaLine(toEventLocationSelection(locationDto()))).toBe(
      "영상 34 · 19:00~20:00",
    );
  });

  it("운영 시간이 null이면 시간 토막을 생략한다 (AC 3)", () => {
    const selection = toEventLocationSelection(
      locationDto({ operatingHours: null, videoCount: 0 }),
    );

    expect(eventLocationMetaLine(selection)).toBe("영상 0");
  });
});

describe("eventLocationGridNotice — 격자 안내 문구 (AC 4)", () => {
  it('1행 문구 "이 위치의 행사 격자 N개"만 만든다 (AC 4, 확정 결정 2)', () => {
    expect(eventLocationGridNotice(4)).toBe("이 위치의 행사 격자 4개");
  });
});

describe("eventLocationSectionTitle — 영상 섹션 제목 (AC 5)", () => {
  it('위치명 앞토막으로 "{앞토막} 현장 영상"을 만든다 (AC 5)', () => {
    expect(eventLocationSectionTitle("광안리 피카츄 퍼레이드")).toBe(
      "광안리 현장 영상",
    );
  });

  it("공백 없는 한 단어 위치명은 그대로 앞토막이다 (경계)", () => {
    expect(eventLocationSectionTitle("서면팝업존")).toBe(
      "서면팝업존 현장 영상",
    );
  });
});
