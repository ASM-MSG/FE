import { describe, expect, it } from "vitest";
import { decodeGridIndex, encodeGridId } from "./grid-5179";

/**
 * F-11: `encodeGridId`(좌표 → 서버 격자 id)가 웹 원본과 같은 입력에 같은 출력을 낸다
 * (MSG-427 승인 Q5 — 미션 영역 격자 타일 렌더에 필요한 포팅 3종 중 하나).
 *
 * 웹 원본은 변수 경로 동적 import (grid-5179.parity.test.ts 선례 — 웹 소스의 "@/…"
 * 별칭이 모바일 tsconfig paths로 잘못 해석되는 것을 피한다).
 */
const WEB_GRID_PATH = new URL(
  "../../../../../web/src/entities/cell/model/grid.ts",
  import.meta.url,
).pathname;

interface WebGrid {
  encodeGridId: typeof encodeGridId;
}

const loadWebGrid = (): Promise<WebGrid> => import(WEB_GRID_PATH);

/** 좌표 표본 — 부산 서면 일대 + 셀 경계·원점 인근 */
const POINT_SAMPLES = [
  { lat: 35.1578, lng: 129.0594 }, // 서면 중심
  { lat: 35.1631, lng: 129.0652 }, // 서면 북동
  { lat: 35.0964, lng: 128.9721 }, // 부산 서남부
  { lat: 35.2489, lng: 129.1187 }, // 부산 북동부
  { lat: 38, lng: 127.5 }, // 5179 투영 원점
  { lat: 33.0001, lng: 126.0001 }, // 남서 먼 지점
] as const;

describe("encodeGridId 웹 원본 동등성 (F-11)", () => {
  it("표본 전건에서 웹 원본과 같은 격자 id를 낸다", async () => {
    const web = await loadWebGrid();

    for (const point of POINT_SAMPLES) {
      expect(encodeGridId(point)).toBe(web.encodeGridId(point));
    }
  });

  it("인코드한 격자 id는 `{gridY}_{gridX}` 형식이고 decodeGridIndex로 되돌아온다", () => {
    for (const point of POINT_SAMPLES) {
      const gridId = encodeGridId(point);

      expect(gridId).toMatch(/^-?\d+_-?\d+$/);
      const { gridX, gridY } = decodeGridIndex(gridId);
      expect(`${gridY}_${gridX}`).toBe(gridId);
    }
  });
});
