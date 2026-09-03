import { describe, expect, it } from "vitest";
import type { EventLocationResponseDto } from "../../../shared/api/sdk";
import {
  eventPeriodLabel,
  toLocationCardViews,
  viewerCountLabel,
} from "./event-overview";

/**
 * AC 6 (D9): `eventPeriodLabel`·`toLocationCardViews`가 웹 원본과 동등하다.
 * 실데이터 id 5 위치 2곳(서면 목데이터 팝업·포토존)을 표본으로 쓴다.
 * 모바일 카드 뷰는 웹의 `dto` 슬롯(MSG-534 카드 탭 재료)을 싣지 않는다 — D10 미렌더.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/event/model/event-overview.ts",
  import.meta.url,
).pathname;

interface WebOverview {
  eventPeriodLabel: typeof eventPeriodLabel;
  viewerCountLabel: typeof viewerCountLabel;
  toLocationCardViews: (
    locations: EventLocationResponseDto[],
  ) => (ReturnType<typeof toLocationCardViews>[number] & { dto: unknown })[];
}

const loadWeb = (): Promise<WebOverview> => import(WEB_PATH);

const location = (
  over: Partial<EventLocationResponseDto> &
    Pick<EventLocationResponseDto, "locationId" | "name" | "type">,
): EventLocationResponseDto => ({
  operatingHours: null,
  gridIds: ["16858_11420"],
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

const LOCATIONS: EventLocationResponseDto[] = [
  location({
    locationId: 10,
    name: "서면 목데이터 팝업",
    type: "POPUP",
    operatingHours: "11:00~20:00",
    imageUrl: "https://img.test/popup.jpg",
  }),
  location({
    locationId: 11,
    name: "서면 목데이터 포토존",
    type: "PHOTO_ZONE",
    videoCount: 1,
  }),
];

describe("event-overview 웹 원본 동등성 (AC 6)", () => {
  it("eventPeriodLabel이 KST 날짜부 `M.D–M.D`(en dash) — 웹과 동일", async () => {
    const web = await loadWeb();
    const cases: [string, string][] = [
      ["2026-08-25T00:00:00", "2026-09-30T23:59:59"],
      ["2026-09-04T15:30:00Z", "2026-09-05T13:00:00Z"],
      ["2026-01-01T00:00:00", "2026-12-31T00:00:00"],
    ];

    for (const [startsAt, endsAt] of cases) {
      expect(eventPeriodLabel(startsAt, endsAt)).toBe(
        web.eventPeriodLabel(startsAt, endsAt),
      );
    }
    expect(eventPeriodLabel(cases[0][0], cases[0][1])).toBe("8.25–9.30");
  });

  it("toLocationCardViews가 `유형 · 운영시간`(null이면 유형만)·`영상 N`·imageUrl을 웹과 같게 낸다", async () => {
    const web = await loadWeb();
    const webViews = web
      .toLocationCardViews(LOCATIONS)
      .map(({ dto: _dto, ...view }) => view);

    expect(toLocationCardViews(LOCATIONS)).toEqual(webViews);
    expect(toLocationCardViews(LOCATIONS)).toEqual([
      {
        locationId: 10,
        name: "서면 목데이터 팝업",
        meta: "팝업 · 11:00~20:00",
        videoBadge: "영상 0",
        imageUrl: "https://img.test/popup.jpg",
      },
      {
        locationId: 11,
        name: "서면 목데이터 포토존",
        meta: "포토존",
        videoBadge: "영상 1",
        imageUrl: null,
      },
    ]);
  });

  /** AC 8 (MSG-560 D9) — 0은 값이고("0명 보는 중"), null(조회 실패·캐시 장애)은 미표시다 */
  it("viewerCountLabel이 0을 `0명 보는 중`으로, null을 미표시(null)로 낸다", async () => {
    const web = await loadWeb();

    for (const count of [null, 0, 1, 42]) {
      expect(viewerCountLabel(count)).toBe(web.viewerCountLabel(count));
    }
    expect(viewerCountLabel(0)).toBe("0명 보는 중");
    expect(viewerCountLabel(42)).toBe("42명 보는 중");
    expect(viewerCountLabel(null)).toBeNull();
  });
});
