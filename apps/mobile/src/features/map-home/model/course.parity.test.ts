import { describe, expect, it } from "vitest";
import {
  coursePath,
  courseSpots,
  isLoopCourse,
  parseLineString,
} from "./course";

/**
 * E7·E14·E15: 포토스팟이 `seq` 오름차순(NULL은 뒤) 안정 정렬 뒤 1부터 순번을 재부여받고,
 * `parseLineString`이 GeoJSON `[lng, lat]`를 `{lat, lng}`로 뒤집으며 파싱 실패·type
 * 불일치를 빈 배열로 흡수한다. 라인이 없으면 스팟을 번호 순으로 잇는다 (MSG-427) —
 * 웹 원본 동등.
 */
const WEB_PATH = new URL(
  "../../../../../web/src/features/map-home/model/course.ts",
  import.meta.url,
).pathname;

interface WebCourse {
  parseLineString: typeof parseLineString;
  courseSpots: typeof courseSpots;
  coursePath: typeof coursePath;
  isLoopCourse: typeof isLoopCourse;
}

const loadWeb = (): Promise<WebCourse> => import(WEB_PATH);

const LINE_SAMPLES: (string | null)[] = [
  null,
  '{"type":"LineString","coordinates":[[129.0594,35.1578],[129.0652,35.1631]]}',
  '{"type":"Point","coordinates":[129.0594,35.1578]}',
  '{"type":"LineString","coordinates":"깨짐"}',
  "{깨진 JSON",
  '{"type":"LineString","coordinates":[[129.0594,35.1578],["x",1]]}',
];

const SPOT_DTOS = [
  { gridId: "a", lat: 35.1578, lng: 129.0594, seq: 2 },
  { gridId: "b", lat: 35.1631, lng: 129.0652, seq: null },
  { gridId: "c", lat: 35.1601, lng: 129.0621, seq: 1 },
  { gridId: "d", lat: 35.1611, lng: 129.0631, seq: null },
];

describe("course 웹 원본 동등성 (E7·E14·E15)", () => {
  it("seq 오름차순(NULL 뒤) 안정 정렬 후 1부터 순번을 다시 부여한다", () => {
    const spots = courseSpots(SPOT_DTOS, new Set(["a"]));

    expect(spots.map((s) => s.gridId)).toEqual(["c", "a", "b", "d"]);
    expect(spots.map((s) => s.order)).toEqual([1, 2, 3, 4]);
    expect(spots.map((s) => s.visited)).toEqual([false, true, false, false]);
  });

  it("GeoJSON [lng, lat]를 {lat, lng}로 뒤집고 파싱 실패는 빈 배열로 흡수한다", () => {
    expect(parseLineString(LINE_SAMPLES[1])).toEqual([
      { lat: 35.1578, lng: 129.0594 },
      { lat: 35.1631, lng: 129.0652 },
    ]);
    expect(parseLineString(null)).toEqual([]);
    expect(parseLineString(LINE_SAMPLES[2])).toEqual([]);
    expect(parseLineString("{깨진 JSON")).toEqual([]);
  });

  it("라인이 없으면 포토스팟을 번호 순서대로 잇고, 1점뿐이면 그리지 않는다", () => {
    const spots = courseSpots(SPOT_DTOS, new Set());

    expect(coursePath(null, spots)).toEqual(spots.map((s) => s.position));
    expect(coursePath(null, spots.slice(0, 1))).toEqual([]);
  });

  it("표본 전건에서 웹 원본과 같은 값을 낸다", async () => {
    const web = await loadWeb();
    const visited = new Set(["a", "d"]);
    const spots = courseSpots(SPOT_DTOS, visited);

    expect(spots).toEqual(web.courseSpots(SPOT_DTOS, visited));
    for (const line of LINE_SAMPLES) {
      expect(parseLineString(line)).toEqual(web.parseLineString(line));
      expect(coursePath(line, spots)).toEqual(web.coursePath(line, spots));
      expect(isLoopCourse(coursePath(line, spots))).toBe(
        web.isLoopCourse(web.coursePath(line, spots)),
      );
    }
  });
});
