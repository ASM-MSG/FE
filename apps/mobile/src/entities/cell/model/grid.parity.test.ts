import { describe, expect, it } from "vitest";
import * as mobileGrid from "./grid";

/**
 * AC 1: 모바일 격자 모듈 ↔ 웹 grid.ts 동등성 (스펙 D1 — 복제 + 동등성 테스트).
 *
 * 웹 원본은 변수 경로 동적 import로 로드한다 — 정적 import를 쓰지 않는 이유:
 * 웹 grid.ts의 타입 의존(./cell → "@/shared/api/…" 별칭)이 모바일 tsconfig의
 * paths(@/* → 모바일 src)로 잘못 해석되어 typecheck가 깨진다. 런타임 의존은
 * cell-geometry(순수 상수)뿐이라 실행은 안전하다(스펙 구현 계획 D1 전제).
 * 웹 파일이 이동하면 이 테스트가 깨진다 — 의도된 드리프트 감지 (스펙 리스크 4).
 */
const WEB_GRID_PATH = new URL(
  "../../../../../web/src/entities/cell/model/grid.ts",
  import.meta.url,
).pathname;
const loadWebGrid = (): Promise<typeof mobileGrid> => import(WEB_GRID_PATH);

describe("grid 동등성 (AC 1)", () => {
  it("원점 GRID_ORIGIN(34.98495/128.79626)·셀 크기·기준 위도가 웹 원본과 동일하다", async () => {
    const webGrid = await loadWebGrid();
    expect(mobileGrid.GRID_ORIGIN).toEqual({ lat: 34.98495, lng: 128.79626 });
    expect(mobileGrid.GRID_ORIGIN).toEqual(webGrid.GRID_ORIGIN);
    expect(mobileGrid.GRID_CELL_METERS).toBe(webGrid.GRID_CELL_METERS);
    expect(mobileGrid.GRID_REF_LAT).toBe(webGrid.GRID_REF_LAT);
  });

  it("위경도 스텝(GRID_LAT_STEP·GRID_LNG_STEP)이 웹 원본과 정확히 같다", async () => {
    const webGrid = await loadWebGrid();
    expect(mobileGrid.GRID_LAT_STEP).toBe(webGrid.GRID_LAT_STEP);
    expect(mobileGrid.GRID_LNG_STEP).toBe(webGrid.GRID_LNG_STEP);
  });

  it("cellIndexAt 결과가 웹 원본과 동일하다 — 서면 중심·원점·원점 남서쪽 좌표", async () => {
    const webGrid = await loadWebGrid();
    const samples = [
      { lat: 35.1579, lng: 129.0594 }, // 서면 중심 (mock 기준 지역)
      { lat: 34.98495, lng: 128.79626 }, // 원점 (sw 변 포함 스냅)
      { lat: 34.9, lng: 128.7 }, // 원점 남서쪽 — 음수 인덱스
      { lat: 35.38, lng: 129.25 }, // 부산 북동부
    ];
    for (const point of samples) {
      expect(mobileGrid.cellIndexAt(point)).toEqual(webGrid.cellIndexAt(point));
    }
  });

  it("cellBoundsAt 결과가 웹 원본과 동일하다 — 양수·0·음수 인덱스", async () => {
    const webGrid = await loadWebGrid();
    const samples = [
      { col: 0, row: 0 },
      { col: 2412, row: 1925 }, // 서면 일대 규모의 큰 인덱스
      { col: -3, row: -7 },
    ];
    for (const index of samples) {
      expect(mobileGrid.cellBoundsAt(index)).toEqual(
        webGrid.cellBoundsAt(index),
      );
    }
  });
});
