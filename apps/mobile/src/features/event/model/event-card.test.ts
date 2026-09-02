import { describe, expect, it } from "vitest";
import type { EventOccurrenceChip } from "../../../entities/event/model/event";
import { toEventCardViews } from "./event-card";

/**
 * AC 4·6 (D6·D7): 목록 카드 = 제목 + 상태 배지 + `{cityName} · {M.D–M.D}`.
 * 서버 정렬을 유지한다.
 */
const CHIPS: EventOccurrenceChip[] = [
  {
    occurrenceId: 5,
    title: "서면 목데이터 축제",
    cityName: "부산",
    startsAt: "2026-08-25T00:00:00",
    endsAt: "2026-09-30T23:59:59",
    status: "LIVE",
  },
  {
    occurrenceId: 3,
    title: "서울세계불꽃축제",
    cityName: "서울",
    startsAt: "2026-09-05T14:00:00",
    endsAt: "2026-09-05T22:00:00",
    status: "UPCOMING",
  },
];

describe("toEventCardViews — 목록 카드 뷰 (AC 4·D6)", () => {
  it("제목·상태 배지·`{도시} · {기간}`을 서버 정렬 그대로 낸다", () => {
    expect(toEventCardViews(CHIPS, "2026-09-02")).toEqual([
      {
        occurrenceId: 5,
        title: "서면 목데이터 축제",
        status: "LIVE",
        badge: null,
        subtitle: "부산 · 8.25–9.30",
      },
      {
        occurrenceId: 3,
        title: "서울세계불꽃축제",
        status: "UPCOMING",
        badge: { kind: "upcoming", label: "D-3" },
        subtitle: "서울 · 9.5–9.5",
      },
    ]);
  });

  it("빈 목록은 빈 배열이다", () => {
    expect(toEventCardViews([], "2026-09-02")).toEqual([]);
  });
});
