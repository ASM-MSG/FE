import { describe, expect, it } from "vitest";
import {
  decodeHtmlEntities,
  formatCourseDuration,
  formatDistanceKm,
  formatMissionPeriod,
  formatOperationTime,
} from "./mission-format";

/**
 * D6·D7·E6: 기간(`8.11~8.16`·`11.7까지`·`상시`)·운영시간 폴백·HTML 엔티티 복원·
 * 거리/소요시간 null 생략이 웹 원본과 같다 (MSG-427).
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/map-home/model/mission-format.ts",
  import.meta.url,
).pathname;

interface WebFormat {
  decodeHtmlEntities: typeof decodeHtmlEntities;
  formatMissionPeriod: typeof formatMissionPeriod;
  formatOperationTime: typeof formatOperationTime;
  formatDistanceKm: typeof formatDistanceKm;
  formatCourseDuration: typeof formatCourseDuration;
}

const loadWeb = (): Promise<WebFormat> => import(WEB_PATH);

const PERIODS: [string | null, string | null][] = [
  ["2026-08-11T00:00:00", "2026-08-16T00:00:00"],
  [null, "2026-11-07T00:00:00"],
  ["2026-08-11T00:00:00", null],
  [null, null],
];
const ENTITY_SAMPLES = [
  "에일리언스테이지 &#x27;AaD&#x27;",
  "&lt;부산 &amp; 서면&gt;",
  "&quot;팝업&quot;&nbsp;스토어",
  "&#48512;&#49328;",
  "&unknown; 그대로",
  "이스케이프 없음",
];
const OPERATION_TIMES: (string | null)[] = [null, "", "매일 11:00~22:00"];
const DISTANCES: (number | null)[] = [null, 0, 450, 1000, 12340];
const DURATIONS: (number | null)[] = [null, 0, 45, 60, 330];

describe("mission-format 웹 원본 동등성 (D6·D7·E6)", () => {
  it("기간을 `8.11~8.16`·`11.7까지`·`8.11부터`·`상시`로 표기한다", () => {
    expect(formatMissionPeriod(PERIODS[0][0], PERIODS[0][1])).toBe("8.11~8.16");
    expect(formatMissionPeriod(null, PERIODS[1][1])).toBe("11.7까지");
    expect(formatMissionPeriod(PERIODS[2][0], null)).toBe("8.11부터");
    expect(formatMissionPeriod(null, null)).toBe("상시");
  });

  it("운영시간이 비면 `운영시간 추후공지`로 바꾼다", () => {
    expect(formatOperationTime(null)).toBe("운영시간 추후공지");
    expect(formatOperationTime("")).toBe("운영시간 추후공지");
    expect(formatOperationTime("매일 11:00~22:00")).toBe("매일 11:00~22:00");
  });

  it("HTML 이스케이프된 제목을 복원해 `&#x27;`이 화면에 남지 않는다", () => {
    expect(decodeHtmlEntities("에일리언스테이지 &#x27;AaD&#x27;")).toBe(
      "에일리언스테이지 'AaD'",
    );
    expect(decodeHtmlEntities("&lt;부산 &amp; 서면&gt;")).toBe("<부산 & 서면>");
  });

  it("거리·소요시간이 null이면 null을 반환해 뷰가 칸을 그리지 않는다", () => {
    expect(formatDistanceKm(null)).toBeNull();
    expect(formatCourseDuration(null)).toBeNull();
    expect(formatDistanceKm(12340)).toBe("12.3km");
    expect(formatCourseDuration(330)).toBe("5시간 30분");
  });

  it("표본 전건에서 웹 원본과 같은 문자열을 낸다", async () => {
    const web = await loadWeb();

    for (const [startAt, endAt] of PERIODS) {
      expect(formatMissionPeriod(startAt, endAt)).toBe(
        web.formatMissionPeriod(startAt, endAt),
      );
    }
    for (const text of ENTITY_SAMPLES) {
      expect(decodeHtmlEntities(text)).toBe(web.decodeHtmlEntities(text));
    }
    for (const time of OPERATION_TIMES) {
      expect(formatOperationTime(time)).toBe(web.formatOperationTime(time));
    }
    for (const meters of DISTANCES) {
      expect(formatDistanceKm(meters)).toBe(web.formatDistanceKm(meters));
    }
    for (const minutes of DURATIONS) {
      expect(formatCourseDuration(minutes)).toBe(
        web.formatCourseDuration(minutes),
      );
    }
  });
});
