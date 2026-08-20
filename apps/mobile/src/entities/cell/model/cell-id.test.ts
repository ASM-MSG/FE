import { describe, expect, it } from "vitest";
import { cellIdFor, parseCellId, serverGridIdFromCellId } from "./cell-id";
import { GRID_LAT_STEP, GRID_LNG_STEP } from "./grid";
import { encodeGridId as encodeGridId5179 } from "./grid-5179";

describe("셀 id 인코딩 (AC 1 — 탭 좌표→셀 인덱스→셀 id 매핑)", () => {
  it('인덱스를 "cell-{col}-{row}"로 인코딩한다', () => {
    expect(cellIdFor({ col: 2412, row: 1925 })).toBe("cell-2412-1925");
  });

  it("음수 인덱스(원점 남서쪽)도 왕복 인코딩·파싱된다", () => {
    const samples = [
      { col: 0, row: 0 },
      { col: 2412, row: 1925 },
      { col: -3, row: -7 },
    ];
    for (const index of samples) {
      expect(parseCellId(cellIdFor(index))).toEqual(index);
    }
  });

  it("인코딩 형식이 아닌 id는 null을 반환한다", () => {
    expect(parseCellId("seomyeon-a-14")).toBeNull();
    expect(parseCellId("cell-1.5-2")).toBeNull();
    expect(parseCellId("cell--")).toBeNull();
  });
});

describe("serverGridIdFromCellId — 라우트 셀 id → 서버 격자 id (MSG-431 E)", () => {
  it('서면 중심 셀 "cell-112225-39064"를 서버 격자 id "16858_11420"으로 변환한다 (E)', () => {
    expect(serverGridIdFromCellId("cell-112225-39064")).toBe("16858_11420");
  });

  it("부산 서면 일대 셀 3건이 각각 그 셀 중심이 속한 서버 격자 id로 변환된다 (E)", () => {
    const samples = [
      { cellId: "cell-112225-39064", gridId: "16858_11420" },
      { cellId: "cell-112227-39066", gridId: "16860_11422" },
      { cellId: "cell-112222-39061", gridId: "16855_11417" },
    ];

    for (const { cellId, gridId } of samples) {
      expect(serverGridIdFromCellId(cellId)).toBe(gridId);
    }
  });

  it("변환 결과는 셀 중심 좌표를 5179로 인코딩한 값과 같다 — 인덱스 문자열 재조합이 아니다 (E)", () => {
    const index = { col: 112225, row: 39064 };
    const center = {
      lat: (index.row + 0.5) * GRID_LAT_STEP,
      lng: (index.col + 0.5) * GRID_LNG_STEP,
    };

    expect(serverGridIdFromCellId(cellIdFor(index))).toBe(
      encodeGridId5179(center),
    );
    // 스펙이 제시한 "{row}_{col}" 단순 재조합과는 다른 값이다 (좌표계 이원화 — 스펙 이슈 1)
    expect(serverGridIdFromCellId(cellIdFor(index))).not.toBe(
      `${index.row}_${index.col}`,
    );
  });

  it("인코딩 형식이 아닌 셀 id는 null을 반환한다 — 변환 불가 (E)", () => {
    expect(serverGridIdFromCellId("seomyeon-a-14")).toBeNull();
  });
});
