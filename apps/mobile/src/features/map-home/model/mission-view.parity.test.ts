import { describe, expect, it } from "vitest";
import type { MissionResponseDto } from "../../../shared/api/sdk";
import { toCourseView, toMissionView } from "./mission-view";

/**
 * D4·D7·E2: 목록 카드·상세·지도 오버레이가 공유하는 단일 미션 표시 모델이 웹 원본과 같다
 * (MSG-427) — 제목·장소명 HTML 엔티티 복원, 도형 판별, 진행도·상태 배지, 코스 스팟·경로.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/map-home/model/mission-view.ts",
  import.meta.url,
).pathname;

interface WebMissionView {
  toMissionView: typeof toMissionView;
  toCourseView: typeof toCourseView;
}

const loadWeb = (): Promise<WebMissionView> => import(WEB_PATH);

const NOW = new Date(2026, 7, 19, 13, 0, 0);

const EVENT: MissionResponseDto = {
  missionId: 11,
  type: "EVENT",
  title: "에일리언스테이지 &#x27;AaD&#x27;",
  targetCount: 3,
  startAt: "2026-08-11T00:00:00",
  endAt: "2026-08-16T00:00:00",
  shape: {
    polygon: [
      { lat: 35.155, lng: 129.056 },
      { lat: 35.16, lng: 129.056 },
      { lat: 35.16, lng: 129.062 },
      { lat: 35.155, lng: 129.062 },
    ],
  },
  description: null,
  placeName: "부산 부산진구 &amp; 서면",
  sourceUrl: null,
  operationTime: null,
  imageUrl: null,
  distanceMeters: null,
  durationMinutes: null,
  difficulty: null,
} as unknown as MissionResponseDto;

const COURSE: MissionResponseDto = {
  ...EVENT,
  missionId: 12,
  type: "COURSE",
  title: "서면 산책 코스",
  placeName: "부산 부산진구",
  distanceMeters: 12340,
  durationMinutes: 330,
  shape: {
    line: '{"type":"LineString","coordinates":[[129.0594,35.1578],[129.0652,35.1631]]}',
    spots: [
      { gridId: "16882_11434", lat: 35.1631, lng: 129.0652, seq: 2 },
      { gridId: "16858_11420", lat: 35.1578, lng: 129.0594, seq: 1 },
    ],
  },
} as unknown as MissionResponseDto;

const PROGRESS = {
  missionId: 11,
  targetCount: 3,
  filledCount: 1,
  completed: false,
};

describe("mission-view 웹 원본 동등성 (D4·D7·E2)", () => {
  it("서버가 이스케이프한 제목·장소명을 복원해 `&#x27;`이 화면에 남지 않는다", () => {
    const view = toMissionView(EVENT, PROGRESS, NOW);

    expect(view.title).toBe("에일리언스테이지 'AaD'");
    expect(view.placeName).toBe("부산 부산진구 & 서면");
  });

  it("코스는 스팟이 순번대로 재정렬되고 방문 격자가 상세 통계에서 온다", () => {
    const view = toCourseView(COURSE, undefined, new Set(["16858_11420"]), NOW);

    expect(view.spots.map((spot) => spot.gridId)).toEqual([
      "16858_11420",
      "16882_11434",
    ]);
    expect(view.spots.map((spot) => spot.visited)).toEqual([true, false]);
    expect(view.path).toHaveLength(2);
  });

  it("표본 전건에서 웹 원본과 같은 표시 모델을 낸다", async () => {
    const web = await loadWeb();
    const visited = new Set(["16858_11420"]);

    for (const progress of [undefined, PROGRESS]) {
      expect(toMissionView(EVENT, progress, NOW)).toEqual(
        web.toMissionView(EVENT, progress, NOW),
      );
      expect(toCourseView(COURSE, progress, visited, NOW)).toEqual(
        web.toCourseView(COURSE, progress, visited, NOW),
      );
    }
  });
});
