import proj4 from "proj4";
import { describe, expect, it } from "vitest";
import {
  CELL_SIZE_METERS,
  CRS_DEF_EPSG5179,
  cellCornersAt,
  viewportGridRange,
  type Bounds,
} from "@/entities/cell";
import { pointInPolygon, BUSAN_BOUNDARY } from "@/entities/region";
import { MOCK_OCCUPIED_GRIDS } from "@/test/occupied-grids";
import {
  GRID_MIN_ZOOM,
  buildGridLines,
  excludeSectionCells,
} from "./grid-overlay";
import { toOccupiedOverlays } from "./occupied-grid-overlay";

/** 서면 일대 뷰포트 — 기본 줌 15 체감 크기(약 1km 남짓) */
const SEOMYEON_VIEWPORT: Bounds = {
  sw: { lat: 35.153, lng: 129.053 },
  ne: { lat: 35.163, lng: 129.065 },
};

/** 부산 경계에서 수십 km 떨어진 남해 전용 뷰포트 — 한 화면 버퍼를 더해도 부산 밖 */
const OPEN_SEA_VIEWPORT: Bounds = {
  sw: { lat: 34.5, lng: 129.0 },
  ne: { lat: 34.55, lng: 129.06 },
};

/** 검증용 독립 변환기 — 구현과 같은 정본 정의 문자열로 만든 교차 대조 기준 */
const verify5179 = proj4("WGS84", CRS_DEF_EPSG5179);

/** 한 화면 버퍼 뷰포트 (구현의 R3 버퍼 규칙과 동일) */
const bufferedOf = ({ sw, ne }: Bounds): Bounds => {
  const latSpan = ne.lat - sw.lat;
  const lngSpan = ne.lng - sw.lng;
  return {
    sw: { lat: sw.lat - latSpan, lng: sw.lng - lngSpan },
    ne: { lat: ne.lat + latSpan, lng: ne.lng + lngSpan },
  };
};

describe("buildGridLines — 뷰포트 격자선 파생 (MSG-263 AC 2·5·6 · MSG-357 EPSG:5179)", () => {
  it("뷰포트∩부산 범위의 선분만 반환한다 — 선분 중점이 모두 행정경계 내부다 (AC 2·3)", () => {
    const lines = buildGridLines(SEOMYEON_VIEWPORT, 15);

    expect(lines.length).toBeGreaterThan(0);
    for (const { path } of lines) {
      const mid = {
        lat: (path[0].lat + path[1].lat) / 2,
        lng: (path[0].lng + path[1].lng) / 2,
      };
      expect(pointInPolygon(mid, BUSAN_BOUNDARY)).toBe(true);
    }
  });

  it("격자선 선분이 5179 셀 경계의 역변환 좌표와 일치한다 — 끝점을 5179로 변환하면 id의 경계 좌표(×100m)다 (MSG-357 기준 5)", () => {
    const lines = buildGridLines(SEOMYEON_VIEWPORT, 15);
    expect(lines.length).toBeGreaterThan(0);

    // 절단된 끝점은 위경도 직선 근사(끝점만 역변환 — 스펙 명시) 위 점이라 버퍼 범위(~3.3km)
    // 현(弦)의 자오선 수렴 곡률 오차가 실린다 — 실측 최대 ~16cm (zoom 15에서 1px ≈ 4m라
    // 화면상 구분 불가). 0.5m 상한은 직선 근사를 허용하면서도 구 위경도 스텝 격자
    // (수십 m 어긋남)를 확실히 거른다
    const METER_TOLERANCE = 0.5;
    for (const { id, path } of lines) {
      const [axis, indexText] = id.split("-");
      const boundary = Number(indexText) * CELL_SIZE_METERS;
      for (const point of path) {
        const [x, y] = verify5179.forward([point.lng, point.lat]);
        const actual = axis === "v" ? x : y;
        expect(Math.abs(actual - boundary), id).toBeLessThanOrEqual(
          METER_TOLERANCE,
        );
      }
    }
  });

  it("격자선 경계 좌표가 셀 꼭짓점 계산과 교차 대조된다 — 뷰포트 내 셀의 꼭짓점이 대응 격자선 위에 있다 (MSG-357 기준 5)", () => {
    const lines = buildGridLines(SEOMYEON_VIEWPORT, 15);
    const range = viewportGridRange(SEOMYEON_VIEWPORT);
    // 뷰포트 중앙부 셀 — 부산 내부라 사방 격자선이 절단 없이 존재한다
    const cell = {
      gridX: Math.round((range.minGridX + range.maxGridX) / 2),
      gridY: Math.round((range.minGridY + range.maxGridY) / 2),
    };
    const [swCorner] = cellCornersAt(cell);
    const [x, y] = verify5179.forward([swCorner.lng, swCorner.lat]);

    // 남서 꼭짓점의 5179 좌표 = 대응 수직·수평 격자선의 경계 좌표
    expect(x).toBeCloseTo(cell.gridX * CELL_SIZE_METERS, 6);
    expect(y).toBeCloseTo(cell.gridY * CELL_SIZE_METERS, 6);
    expect(lines.some((l) => l.id.startsWith(`v-${cell.gridX}-`))).toBe(true);
    expect(lines.some((l) => l.id.startsWith(`h-${cell.gridY}-`))).toBe(true);
  });

  it("부산 밖 전용 뷰포트면 빈 배열이다 (AC 2)", () => {
    expect(buildGridLines(OPEN_SEA_VIEWPORT, 15)).toEqual([]);
  });

  it("줌 15 미만이면 빈 결과, 15 이상이면 반환한다 (AC 6, D4)", () => {
    expect(GRID_MIN_ZOOM).toBe(15);
    expect(buildGridLines(SEOMYEON_VIEWPORT, 14)).toEqual([]);
    expect(
      buildGridLines(SEOMYEON_VIEWPORT, GRID_MIN_ZOOM).length,
    ).toBeGreaterThan(0);
    expect(buildGridLines(SEOMYEON_VIEWPORT, 16).length).toBeGreaterThan(0);
  });

  it("파생 도형 수가 셀 수(열×행)가 아닌 선 수(열+행) 규모에 머문다 — 뷰포트 크기 기준 상한 가드 (AC 5)", () => {
    const lines = buildGridLines(SEOMYEON_VIEWPORT, 15);

    // 한 화면 버퍼(양쪽 각 1화면)를 감안한 5179 격자 행·열 수
    const range = viewportGridRange(bufferedOf(SEOMYEON_VIEWPORT));
    const rows = range.maxGridY - range.minGridY + 2;
    const cols = range.maxGridX - range.minGridX + 2;

    // 선 규모 상한 — 경계 절단 분절을 넉넉히 잡아도 (행+열)의 상수배
    expect(lines.length).toBeLessThanOrEqual(4 * (rows + cols));
    // 셀 규모(행×열)와는 자릿수가 다르다
    expect(lines.length).toBeLessThan((rows * cols) / 4);
  });

  it("모든 선분은 버퍼 뷰포트 범위 안이다 — 뷰포트 컬링 (AC 2)", () => {
    const lines = buildGridLines(SEOMYEON_VIEWPORT, 15);
    const buffered = bufferedOf(SEOMYEON_VIEWPORT);

    for (const { path } of lines) {
      for (const point of path) {
        expect(point.lat).toBeGreaterThanOrEqual(buffered.sw.lat);
        expect(point.lat).toBeLessThanOrEqual(buffered.ne.lat);
        expect(point.lng).toBeGreaterThanOrEqual(buffered.sw.lng);
        expect(point.lng).toBeLessThanOrEqual(buffered.ne.lng);
      }
    }
  });
});

describe("excludeSectionCells — 상시 점령 셀 ∩ 섹션 게시 셀 1회 렌더 (MSG-263 개정 2 AC 8, R6)", () => {
  const persistent = toOccupiedOverlays(MOCK_OCCUPIED_GRIDS);

  it("섹션 게시 셀과 id가 겹치는 상시 점령 셀은 렌더 대상에서 제외된다 — 교집합은 섹션(테마) 스타일로 1회만", () => {
    const sectionCells = [
      { id: MOCK_OCCUPIED_GRIDS[0].gridId },
      { id: MOCK_OCCUPIED_GRIDS[1].gridId },
    ];
    const visible = excludeSectionCells(persistent, sectionCells);

    expect(visible.map((o) => o.id)).not.toContain(
      MOCK_OCCUPIED_GRIDS[0].gridId,
    );
    expect(visible.map((o) => o.id)).not.toContain(
      MOCK_OCCUPIED_GRIDS[1].gridId,
    );
    expect(visible).toHaveLength(persistent.length - 2);
  });

  it("겹치지 않는 섹션 게시 셀은 상시 점령 셀을 줄이지 않고, 섹션 게시가 없으면 전체가 유지된다", () => {
    expect(excludeSectionCells(persistent, [{ id: "THEME-ONLY" }])).toEqual(
      persistent,
    );
    expect(excludeSectionCells(persistent, [])).toEqual(persistent);
  });
});
