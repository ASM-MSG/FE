import { describe, expect, it } from "vitest";
import * as mobileGrid from "./grid";

/**
 * AC 1(MSG-294 D1)의 "웹 grid.ts 동등성" 전제는 MSG-357로 **의도적 해제** 상태다 —
 * 웹 격자가 EPSG:5179 미터 좌표(proj4) 체계로 전환됐고(BE PR #134·#135, MSG-347),
 * 모바일 격자는 구 위경도 스텝 체계로 남아 있다. 모바일 5179 마이그레이션은 별도
 * 티켓이다(MSG-357 빌드 리포트 후속 항목 — 지라 환류 대상).
 *
 * 그때까지 이 테스트는 두 가지를 지킨다:
 * 1) 모바일 로컬 체계의 자기 일관성 — 구 서버 정본(MSG-325) 값 그대로인지
 * 2) 웹이 5179 정본을 유지하는지 — 웹이 또 바뀌거나 모바일이 마이그레이션되면
 *    이 파일을 다시 웹 기준 동등성 테스트(픽스처 전수 대조)로 되돌린다
 *
 * 웹 원본은 변수 경로 동적 import로 로드한다 — 정적 import를 쓰지 않는 이유:
 * 웹 grid.ts의 타입 의존(./cell → "@/shared/api/…" 별칭)이 모바일 tsconfig의
 * paths(@/* → 모바일 src)로 잘못 해석되어 typecheck가 깨진다.
 * 웹 파일이 이동하면 이 테스트가 깨진다 — 의도된 드리프트 감지 (스펙 리스크 4).
 */
const WEB_GRID_PATH = new URL(
  "../../../../../web/src/entities/cell/model/grid.ts",
  import.meta.url,
).pathname;

/** 웹 grid.ts의 관측 대상 표면 — 5179 정본 상수와 구 체계 상수의 존재 여부만 본다 */
interface WebGridSurface {
  CRS_DEF_EPSG5179?: string;
  CELL_SIZE_METERS?: number;
  GRID_LAT_STEP?: number;
  GRID_LNG_STEP?: number;
  GRID_ORIGIN?: unknown;
}
const loadWebGrid = (): Promise<WebGridSurface> => import(WEB_GRID_PATH);

describe("모바일 로컬 격자 체계 — 구 서버 정본(MSG-325) 자기 일관성", () => {
  it("원점 GRID_ORIGIN(0/0)·스텝(0.0009/0.00115)이 구 정본 값 그대로다", () => {
    expect(mobileGrid.GRID_ORIGIN).toEqual({ lat: 0, lng: 0 });
    expect(mobileGrid.GRID_LAT_STEP).toBe(0.0009);
    expect(mobileGrid.GRID_LNG_STEP).toBe(0.00115);
  });

  it("cellIndexAt ↔ cellBoundsAt 왕복이 정합한다 — 좌표는 소속 셀 bounds 안이고 bounds 중심의 인덱스는 동일하다", () => {
    const samples = [
      { lat: 35.1579, lng: 129.0594 }, // 서면 중심 (mock 기준 지역)
      { lat: 0, lng: 0 }, // 원점 (sw 변 포함 스냅)
      { lat: -0.001, lng: -0.002 }, // 원점 남서쪽 — 음수 인덱스
      { lat: 35.38, lng: 129.25 }, // 부산 북동부
    ];
    for (const point of samples) {
      const index = mobileGrid.cellIndexAt(point);
      const bounds = mobileGrid.cellBoundsAt(index);
      expect(point.lat).toBeGreaterThanOrEqual(bounds.sw.lat);
      expect(point.lat).toBeLessThan(bounds.ne.lat);
      expect(point.lng).toBeGreaterThanOrEqual(bounds.sw.lng);
      expect(point.lng).toBeLessThan(bounds.ne.lng);
      expect(
        mobileGrid.cellIndexAt({
          lat: (bounds.sw.lat + bounds.ne.lat) / 2,
          lng: (bounds.sw.lng + bounds.ne.lng) / 2,
        }),
      ).toEqual(index);
    }
  });
});

describe("웹 격자 드리프트 감지 — MSG-357 이후 웹은 EPSG:5179 정본이다", () => {
  it("웹 grid.ts는 5179 정의 문자열(BE CRS_DEF_EPSG5179)을 정본으로 내보낸다", async () => {
    const webGrid = await loadWebGrid();
    expect(webGrid.CRS_DEF_EPSG5179).toBe(
      "+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs",
    );
    expect(webGrid.CELL_SIZE_METERS).toBe(100);
  });

  it("웹에는 구 위경도 스텝 체계가 더 이상 없다 — 모바일만 남은 상태(마이그레이션 대기)를 명시한다", async () => {
    const webGrid = await loadWebGrid();
    expect(webGrid.GRID_LAT_STEP).toBeUndefined();
    expect(webGrid.GRID_LNG_STEP).toBeUndefined();
    expect(webGrid.GRID_ORIGIN).toBeUndefined();
  });
});
