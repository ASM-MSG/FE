import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Bounds } from "../../../entities/cell/model/grid";
import {
  EVENT_OCCURRENCES_DEBOUNCE_MS,
  EVENT_VIEWPORT_SPAN_CAP_DEG,
  eventOccurrencesQueryArgs,
  exceedsEventViewportSpan,
  selectEventChips,
} from "./event-occurrences-query";

/**
 * AC 2·3 (D3·D4): 뷰포트 행사 조회 게이트 — 뷰포트 미확정·한 변 0.5° 초과면 미발사,
 * 미발사·미도착은 항상 같은 빈 배열. `exceedsEventViewportSpan`은 웹 원본과 동등.
 *
 * 웹 원본(`use-event-occurrences-query.ts`)은 생성 옵션을 정적 import해 client-config가
 * 딸려 오므로 parity 케이스만 env를 스텁한다 (grid-aggregation-query.test 선례).
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/event/model/use-event-occurrences-query.ts",
  import.meta.url,
).pathname;

const loadWeb = (): Promise<{
  EVENT_OCCURRENCES_DEBOUNCE_MS: number;
  EVENT_VIEWPORT_SPAN_CAP_DEG: number;
  exceedsEventViewportSpan: typeof exceedsEventViewportSpan;
}> => import(WEB_PATH);

const boundsOf = (
  swLat: number,
  swLng: number,
  neLat: number,
  neLng: number,
): Bounds => ({
  sw: { lat: swLat, lng: swLng },
  ne: { lat: neLat, lng: neLng },
});

const SEOMYEON = boundsOf(35.15, 129.05, 35.17, 129.07);
const SAMPLES: Bounds[] = [
  SEOMYEON,
  boundsOf(35, 129, 35.5, 129.5), // 정확히 0.5° (포함)
  boundsOf(35, 129, 35.6, 129.5), // 위도 초과
  boundsOf(35, 129, 35.5, 129.6), // 경도 초과
];

const CHIP = {
  occurrenceId: 5,
  title: "서면 목데이터 축제",
  cityName: "부산",
  startsAt: "2026-08-25T00:00:00",
  endsAt: "2026-09-30T23:59:59",
  status: "LIVE" as const,
};

describe("eventOccurrencesQueryArgs — 게이트 (AC 2·3)", () => {
  it("뷰포트 미확정(null)이면 미발사 + 좌표 0 채움이다", () => {
    expect(eventOccurrencesQueryArgs(null)).toEqual({
      enabled: false,
      query: { swLat: 0, swLng: 0, neLat: 0, neLng: 0 },
    });
  });

  it("한 변 0.5° 초과(저줌)면 미발사다 — 400/13401 예방", () => {
    expect(eventOccurrencesQueryArgs(SAMPLES[2]).enabled).toBe(false);
    expect(eventOccurrencesQueryArgs(SAMPLES[3]).enabled).toBe(false);
  });

  it("상한 이내면 발사하고 bbox를 swLat·swLng·neLat·neLng로 매핑한다", () => {
    expect(eventOccurrencesQueryArgs(SEOMYEON)).toEqual({
      enabled: true,
      query: { swLat: 35.15, swLng: 129.05, neLat: 35.17, neLng: 129.07 },
    });
    expect(eventOccurrencesQueryArgs(SAMPLES[1]).enabled).toBe(true);
  });
});

describe("selectEventChips — 빈 배열 수렴 (AC 2·D4)", () => {
  it("미발사·미도착은 항상 같은 빈 배열이다 (칩 미렌더 판정)", () => {
    const envelope = { developCode: 0, message: "ok", data: [CHIP] };

    expect(selectEventChips(false, envelope)).toBe(
      selectEventChips(true, undefined),
    );
    expect(selectEventChips(false, envelope)).toEqual([]);
  });

  it("발사 + 도착이면 봉투를 벗긴 칩 목록이다", () => {
    expect(
      selectEventChips(true, { developCode: 0, message: "ok", data: [CHIP] }),
    ).toEqual([CHIP]);
  });
});

describe("exceedsEventViewportSpan 웹 원본 동등성 (AC 3)", () => {
  beforeEach(() => {
    vi.stubEnv("EXPO_PUBLIC_API_BASE_URL", "https://api.test.local");
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("디바운스 500ms·상한 0.5°·초과 판정이 웹과 전건 동일하다", async () => {
    const web = await loadWeb();

    expect(EVENT_OCCURRENCES_DEBOUNCE_MS).toBe(
      web.EVENT_OCCURRENCES_DEBOUNCE_MS,
    );
    expect(EVENT_VIEWPORT_SPAN_CAP_DEG).toBe(web.EVENT_VIEWPORT_SPAN_CAP_DEG);
    for (const bounds of SAMPLES) {
      expect(exceedsEventViewportSpan(bounds)).toBe(
        web.exceedsEventViewportSpan(bounds),
      );
    }
    expect(exceedsEventViewportSpan(SAMPLES[1])).toBe(false);
    expect(exceedsEventViewportSpan(SAMPLES[2])).toBe(true);
  });
});
