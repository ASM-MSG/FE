import { describe, expect, it } from "vitest";
import * as mobile5179 from "./grid-5179";

/**
 * L3: EPSG:5179 디코드 3종(decodeGridIndex·cellCenterAt·cellCornersAt)이 임의 gridId
 * 표본 전건에서 웹 원본과 동일한 값을 낸다 (MSG-423).
 *
 * 웹 원본은 변수 경로 동적 import로 로드한다 — 정적 import를 쓰지 않는 이유는
 * grid.parity.test.ts와 동일하다(웹 타입 의존의 "@/…" 별칭이 모바일 tsconfig paths로
 * 잘못 해석되어 typecheck가 깨진다). 웹 파일이 이동하면 이 테스트가 깨진다 —
 * 의도된 드리프트 감지.
 */
const WEB_GRID_PATH = new URL(
  "../../../../../web/src/entities/cell/model/grid.ts",
  import.meta.url,
).pathname;

interface WebGrid5179 {
  CRS_DEF_EPSG5179: string;
  CELL_SIZE_METERS: number;
  decodeGridIndex: typeof mobile5179.decodeGridIndex;
  cellCenterAt: typeof mobile5179.cellCenterAt;
  cellCornersAt: typeof mobile5179.cellCornersAt;
}

const loadWebGrid = (): Promise<WebGrid5179> => import(WEB_GRID_PATH);

/** 서버 gridId 표본 — 부산 일대(서면·전포·서부·북동단) + 음수 인덱스 경계 */
const GRID_ID_SAMPLES = [
  "16858_11420", // 서면 중심
  "16882_11434", // 서면 북동
  "16736_11276", // 부산 서남부
  "17107_11589", // 부산 북동부
  "0_0", // 원점 셀
  "-12_-34", // 음수 인덱스 (5179 원점 남서쪽)
] as const;

describe("EPSG:5179 디코드 3종 ↔ 웹 원본 동등성 (L3)", () => {
  it("5179 정의 문자열·셀 크기가 웹 정본과 글자·값 단위로 같다", async () => {
    const web = await loadWebGrid();

    expect(mobile5179.CRS_DEF_EPSG5179).toBe(web.CRS_DEF_EPSG5179);
    expect(mobile5179.CELL_SIZE_METERS).toBe(web.CELL_SIZE_METERS);
  });

  it("decodeGridIndex가 gridId 표본 전건에서 웹과 같은 {gridX, gridY}를 낸다", async () => {
    const web = await loadWebGrid();

    for (const gridId of GRID_ID_SAMPLES) {
      expect(mobile5179.decodeGridIndex(gridId)).toEqual(
        web.decodeGridIndex(gridId),
      );
    }
  });

  it("cellCenterAt이 gridId 표본 전건에서 웹과 같은 셀 중심 좌표를 낸다", async () => {
    const web = await loadWebGrid();

    for (const gridId of GRID_ID_SAMPLES) {
      const index = mobile5179.decodeGridIndex(gridId);
      expect(mobile5179.cellCenterAt(index)).toEqual(web.cellCenterAt(index));
    }
  });

  it("cellCornersAt이 gridId 표본 전건에서 웹과 같은 꼭짓점 4점(남서→남동→북동→북서)을 낸다", async () => {
    const web = await loadWebGrid();

    for (const gridId of GRID_ID_SAMPLES) {
      const index = mobile5179.decodeGridIndex(gridId);
      expect(mobile5179.cellCornersAt(index)).toEqual(web.cellCornersAt(index));
    }
  });
});
