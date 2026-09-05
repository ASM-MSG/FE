import { describe, expect, it } from "vitest";
import type { EventOccurrenceChip } from "@/entities/event";
import { cityLabel, dDayLabel, toEventSegments } from "./event-chip";

const chip = (over: Partial<EventOccurrenceChip>): EventOccurrenceChip => ({
  occurrenceId: 1,
  title: "부산 불꽃축제",
  cityName: "부산",
  startsAt: "2026-09-07T19:30:00",
  endsAt: "2026-09-07T21:00:00",
  status: "UPCOMING",
  ...over,
});

describe("cityLabel — 역지오코딩 전체 경로의 시 단위 축약 (AC 4)", () => {
  it("광역시 전체 경로는 시 이름만 남긴다 — '부산광역시 부산진구 부전2동' → '부산'", () => {
    expect(cityLabel("부산광역시 부산진구 부전2동")).toBe("부산");
  });

  it("특별시·특별자치시도 접미를 걷어낸다", () => {
    expect(cityLabel("서울특별시 강남구 역삼동")).toBe("서울");
    expect(cityLabel("세종특별자치시")).toBe("세종");
  });

  it("도 단위는 관용 축약한다 — 4자 '경상남도'→'경남', 3자 '경기도'→'경기' (추정 엣지)", () => {
    expect(cityLabel("경상남도 창원시 의창구")).toBe("경남");
    expect(cityLabel("경기도 성남시 분당구")).toBe("경기");
    expect(cityLabel("제주특별자치도 제주시")).toBe("제주");
  });

  it("null·빈 문자열이면 null이다 (경계 — 역지오코딩 미도착·행정동 밖)", () => {
    expect(cityLabel(null)).toBeNull();
    expect(cityLabel("")).toBeNull();
    expect(cityLabel("   ")).toBeNull();
  });
});

describe("dDayLabel — startsAt KST 일수 산술 (AC 6)", () => {
  it("7일 뒤 시작이면 'D-7'이다", () => {
    expect(dDayLabel("2026-09-07T19:30:00", "2026-08-31")).toBe("D-7");
  });

  it("당일 시작은 'D-0'으로 통일한다 (추정 8)", () => {
    expect(dDayLabel("2026-08-31T23:00:00", "2026-08-31")).toBe("D-0");
  });

  it("이미 지난 시작일도 'D-0'이다 (경계 — 음수 D-day 금지, 추정 8)", () => {
    expect(dDayLabel("2026-08-30T10:00:00", "2026-08-31")).toBe("D-0");
  });

  it("오프셋 있는 시각은 KST로 환산해 날짜를 읽는다 — UTC 15시 = KST 익일 0시", () => {
    // 2026-09-06T15:00:00Z = KST 2026-09-07 00:00 → 오늘 08-31 기준 D-7
    expect(dDayLabel("2026-09-06T15:00:00Z", "2026-08-31")).toBe("D-7");
  });
});

describe("toEventSegments — 캡슐 세그먼트 뷰 파생 (AC 6)", () => {
  it("UPCOMING은 D-n 라벨을 갖고 LIVE는 D-day를 표기하지 않는다 (AC 6, 추정 8)", () => {
    const segments = toEventSegments(
      [
        chip({ occurrenceId: 1, status: "UPCOMING" }),
        chip({
          occurrenceId: 2,
          title: "부산국제영화제",
          status: "LIVE",
          startsAt: "2026-08-29T10:00:00",
        }),
      ],
      "2026-08-31",
    );

    expect(segments).toEqual([
      {
        occurrenceId: 1,
        title: "부산 불꽃축제",
        status: "UPCOMING",
        dDay: "D-7",
      },
      {
        occurrenceId: 2,
        title: "부산국제영화제",
        status: "LIVE",
        dDay: null,
      },
    ]);
  });

  it("서버 정렬(시이름→시작일→id)을 그대로 유지한다 — 재정렬하지 않는다", () => {
    const segments = toEventSegments(
      [chip({ occurrenceId: 9 }), chip({ occurrenceId: 3 })],
      "2026-08-31",
    );

    expect(segments.map((s) => s.occurrenceId)).toEqual([9, 3]);
  });

  it("빈 목록이면 빈 배열이다 (경계 — AC 8 미렌더 판정 재료)", () => {
    expect(toEventSegments([], "2026-08-31")).toEqual([]);
  });
});
