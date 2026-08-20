import { describe, expect, it } from "vitest";
import * as mobile5179 from "./grid-5179";

/**
 * L3: EPSG:5179 인코드 1종(encodeGridId) + 디코드 3종(decodeGridIndex·cellCenterAt·
 * cellCornersAt)이 임의 gridId 표본 전건에서 웹 원본과 동일한 값을 낸다 (MSG-423 · MSG-431).
 *
 * **인코드는 MSG-431 재작업에서 추가했다** — `encodeGridId`는 MSG-431에서 새로 복제했는데
 * 대조 범위가 디코드 3종뿐이라 웹 드리프트 감시 밖에 있었다(검증 리포트 §5-②).
 * 이 함수가 갈리면 격자 상세가 엉뚱한 gridId를 조회해 **영상 목록이 통째로 빈다** —
 * 값이 틀려도 화면이 "영상 없음"으로 정상처럼 보이므로 감시가 특히 필요하다.
 * 웹은 `cellIndexAt`을 경유하고 모바일은 `floor`를 인라인하므로 **식이 같은지는 코드로
 * 확인되지 않는다** — 결과값 대조만이 동등성을 증명한다.
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
  encodeGridId: typeof mobile5179.encodeGridId;
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

/**
 * 인코드 입력 좌표 표본 — 서면 중심(`occupied-grids.test.ts` SEOMYEON과 같은 점)과
 * 부산 일대 + 셀 경계 근처(floor 반열림 판정이 갈리기 쉬운 자리) + 원점 남서(음수 인덱스).
 */
const POINT_SAMPLES = [
  { lat: 35.1578, lng: 129.0594 }, // 서면 중심
  { lat: 35.1793, lng: 129.0754 }, // 서면 북동
  { lat: 35.0498, lng: 128.8997 }, // 부산 서남부
  { lat: 35.3798, lng: 129.2499 }, // 부산 북동부
  { lat: 33.4996, lng: 126.5312 }, // 제주 — 경도대가 다른 원점
  { lat: 37.9, lng: 127.4 }, // 5179 원점(38N, 127.5E) 남서 — 음수 인덱스 유발
] as const;

describe("EPSG:5179 인코드·디코드 ↔ 웹 원본 동등성 (L3)", () => {
  it("5179 정의 문자열·셀 크기가 웹 정본과 글자·값 단위로 같다", async () => {
    const web = await loadWebGrid();

    expect(mobile5179.CRS_DEF_EPSG5179).toBe(web.CRS_DEF_EPSG5179);
    expect(mobile5179.CELL_SIZE_METERS).toBe(web.CELL_SIZE_METERS);
  });

  it("encodeGridId가 좌표 표본 전건에서 웹과 같은 gridId 문자열을 낸다 (MSG-431)", async () => {
    const web = await loadWebGrid();

    for (const point of POINT_SAMPLES) {
      expect(mobile5179.encodeGridId(point)).toBe(web.encodeGridId(point));
    }
  });

  it("encodeGridId가 gridId 표본의 셀 중심을 원래 gridId로 되돌린다 — 웹과 같은 왕복 (MSG-431)", async () => {
    const web = await loadWebGrid();

    for (const gridId of GRID_ID_SAMPLES) {
      const center = mobile5179.cellCenterAt(
        mobile5179.decodeGridIndex(gridId),
      );
      expect(mobile5179.encodeGridId(center)).toBe(gridId);
      expect(mobile5179.encodeGridId(center)).toBe(web.encodeGridId(center));
    }
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
