import { describe, expect, it } from "vitest";
import type { EventLocationResponseDto } from "../../../shared/api/sdk";
import {
  eventLocationGridNotice,
  eventLocationMetaLine,
  eventLocationSectionTitle,
  eventLocationTypeLabel,
  toEventLocationSelection,
  type EventLocationType,
} from "./event-location";

/**
 * AC 6(MSG-557): 위치 유형 라벨 5종이 웹 원본과 동등하다 (팝업·체험존·퍼레이드·포토존·기타).
 * AC 1(MSG-560): 선택 스냅숏·메타 줄·격자 안내·섹션 제목도 웹 원본과 동등하다.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/event/model/event-location.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<{
  eventLocationTypeLabel: typeof eventLocationTypeLabel;
  toEventLocationSelection: typeof toEventLocationSelection;
  eventLocationMetaLine: typeof eventLocationMetaLine;
  eventLocationGridNotice: typeof eventLocationGridNotice;
  eventLocationSectionTitle: typeof eventLocationSectionTitle;
}> => import(WEB_PATH);

const TYPES: EventLocationType[] = [
  "POPUP",
  "EXPERIENCE_ZONE",
  "PARADE",
  "PHOTO_ZONE",
  "ETC",
];

/** 실데이터 표본 — occurrenceId 5의 위치 10(팝업, 영상 0)·11(포토존, 영상 1) */
const location = (
  over: Partial<EventLocationResponseDto> &
    Pick<EventLocationResponseDto, "locationId" | "name" | "type">,
): EventLocationResponseDto => ({
  operatingHours: null,
  gridIds: [
    "16858_11420",
    "16858_11421",
    "16858_11422",
    "16859_11420",
    "16859_11421",
    "16859_11422",
    "16860_11420",
    "16860_11421",
    "16860_11422",
  ],
  representativeGridId: "16858_11420",
  zoneName: null,
  zoneCell: null,
  regionName: null,
  videoCount: 0,
  organizerName: null,
  description: null,
  imageUrl: null,
  participationStartsOn: null,
  participationEndsOn: null,
  participationMethod: null,
  ...over,
});

const POPUP = location({
  locationId: 10,
  name: "서면 목데이터 팝업",
  type: "POPUP",
  operatingHours: "11:00~20:00",
});
const PHOTO_ZONE = location({
  locationId: 11,
  name: "서면 목데이터 포토존",
  type: "PHOTO_ZONE",
  videoCount: 1,
});

describe("eventLocationTypeLabel 웹 원본 동등성 (AC 6)", () => {
  it("유형 5종 전건에서 웹과 같은 한글 라벨을 낸다", async () => {
    const web = await loadWeb();

    for (const type of TYPES) {
      expect(eventLocationTypeLabel(type)).toBe(
        web.eventLocationTypeLabel(type),
      );
    }
    expect(TYPES.map(eventLocationTypeLabel)).toEqual([
      "팝업",
      "체험존",
      "퍼레이드",
      "포토존",
      "기타",
    ]);
  });
});

describe("toEventLocationSelection 웹 원본 동등성 (AC 1)", () => {
  it("위치 DTO를 선택 스냅숏(격자 수 포함)으로 웹과 같게 접는다", async () => {
    const web = await loadWeb();

    for (const dto of [POPUP, PHOTO_ZONE]) {
      expect(toEventLocationSelection(dto)).toEqual(
        web.toEventLocationSelection(dto),
      );
    }
    expect(toEventLocationSelection(PHOTO_ZONE)).toEqual({
      locationId: 11,
      name: "서면 목데이터 포토존",
      type: "PHOTO_ZONE",
      operatingHours: null,
      gridCount: 9,
      videoCount: 1,
    });
  });
});

describe("eventLocationMetaLine 웹 원본 동등성 (AC 1)", () => {
  it("operatingHours가 있으면 `영상 N · 운영시간`, null이면 `영상 N`이다", async () => {
    const web = await loadWeb();
    const cases = [
      { videoCount: 1, operatingHours: null },
      { videoCount: 0, operatingHours: "11:00~20:00" },
      { videoCount: 34, operatingHours: "19:00–20:00" },
    ];

    for (const input of cases) {
      expect(eventLocationMetaLine(input)).toBe(
        web.eventLocationMetaLine(input),
      );
    }
    expect(eventLocationMetaLine(cases[0])).toBe("영상 1");
    expect(eventLocationMetaLine(cases[1])).toBe("영상 0 · 11:00~20:00");
  });
});

describe("eventLocationGridNotice 웹 원본 동등성 (AC 1)", () => {
  it("`이 위치의 행사 격자 N개` 1행만 낸다 — 시안 2행은 서버 계약과 모순이라 없다", async () => {
    const web = await loadWeb();

    for (const count of [0, 1, 9, 34]) {
      expect(eventLocationGridNotice(count)).toBe(
        web.eventLocationGridNotice(count),
      );
    }
    expect(eventLocationGridNotice(9)).toBe("이 위치의 행사 격자 9개");
  });
});

describe("eventLocationSectionTitle 웹 원본 동등성 (AC 1)", () => {
  it("위치명 앞토막 + `현장 영상` — 공백 없는 이름은 전체가 앞토막이다", async () => {
    const web = await loadWeb();
    const names = ["서면 목데이터 포토존", "광안리", "  앞뒤공백 포토존  "];

    for (const name of names) {
      expect(eventLocationSectionTitle(name)).toBe(
        web.eventLocationSectionTitle(name),
      );
    }
    expect(eventLocationSectionTitle("서면 목데이터 포토존")).toBe(
      "서면 현장 영상",
    );
    expect(eventLocationSectionTitle("광안리")).toBe("광안리 현장 영상");
  });
});
