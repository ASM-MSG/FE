import { describe, expect, it } from "vitest";
import { cellCornersAt, gridNodeAt } from "@/entities/cell";
import {
  addPreviewLabel,
  areaRowLabel,
  AREA_CELL_LIMIT,
  candidateIssueMessage,
  judgeCandidate,
  rectCellCount,
  rectCornersAt,
  rectSizeLabel,
  rectSpan,
  SIDE_WARN_CELLS,
  toDragRect,
  unionCellCount,
  type AreaRect,
} from "./submission-area";

/** 드래그 시작 셀 — 서면(MVP 지역) 중심 격자 인덱스 실측값 */
const ANCHOR = { gridX: 11420, gridY: 16858 };

/** minGridX부터 cols칸 × minGridY부터 rows칸 사각형 */
const rectOf = (
  gridX: number,
  gridY: number,
  cols: number,
  rows: number,
): AreaRect => ({
  minGridX: gridX,
  maxGridX: gridX + cols - 1,
  minGridY: gridY,
  maxGridY: gridY + rows - 1,
});

describe("toDragRect — 격자 스냅 사각형 (AC 2·3)", () => {
  it("시작 셀에서 북동으로 끌면 시작↔끝 셀의 min/max 사각형이 된다 (AC 2)", () => {
    const rect = toDragRect(ANCHOR, { gridX: 11423, gridY: 16860 });

    expect(rect).toEqual({
      minGridX: 11420,
      maxGridX: 11423,
      minGridY: 16858,
      maxGridY: 16860,
    });
  });

  it("시작 셀보다 남서로 끌어도 같은 사각형으로 정규화된다 (AC 2)", () => {
    const rect = toDragRect(ANCHOR, { gridX: 11417, gridY: 16856 });

    expect(rect).toEqual({
      minGridX: 11417,
      maxGridX: 11420,
      minGridY: 16856,
      maxGridY: 16858,
    });
  });

  it("드래그 없이 같은 셀에서 누르고 떼면 1×1 사각형이 된다 (AC 3)", () => {
    const rect = toDragRect(ANCHOR, ANCHOR);

    expect(rectSpan(rect)).toEqual({ cols: 1, rows: 1 });
    expect(rectCellCount(rect)).toBe(1);
  });
});

describe("rectSpan · rectCellCount — 사각형 규모 (AC 2)", () => {
  it("한 변의 칸 수는 양끝 포함으로 센다", () => {
    expect(rectSpan(rectOf(11420, 16858, 4, 3))).toEqual({ cols: 4, rows: 3 });
  });

  it("칸 수는 가로 × 세로다", () => {
    expect(rectCellCount(rectOf(11420, 16858, 4, 3))).toBe(12);
  });
});

describe("rectSizeLabel · areaRowLabel · addPreviewLabel — 표시 문구 (AC 2·5)", () => {
  it("후보 카드 문구는 '가로 n칸 × 세로 m칸 · k칸'이다 (AC 2)", () => {
    expect(rectSizeLabel(rectOf(11420, 16858, 4, 3))).toBe(
      "가로 4칸 × 세로 3칸 · 12칸",
    );
  });

  it("목록 행 문구는 '영역 n · 가로 a × 세로 b · c칸'이다 (AC 5)", () => {
    expect(areaRowLabel(rectOf(11420, 16858, 3, 3), 0)).toBe(
      "영역 1 · 가로 3 × 세로 3 · 9칸",
    );
  });

  it("추가 예고 문구는 합집합 결과를 상한과 함께 보여준다 (AC 2)", () => {
    expect(addPreviewLabel(21)).toBe("추가하면 21 / 81칸");
  });
});

describe("unionCellCount — 사각형 합집합 칸 수 (AC 5)", () => {
  it("영역이 없으면 0칸이다 (경계)", () => {
    expect(unionCellCount([])).toBe(0);
  });

  it("떨어져 있는 사각형 2개는 칸 수가 더해진다 (AC 5)", () => {
    expect(
      unionCellCount([rectOf(11420, 16858, 3, 3), rectOf(11430, 16868, 2, 2)]),
    ).toBe(13);
  });

  it("겹치는 사각형 2개를 더해도 겹친 칸은 1회만 센다 (AC 5)", () => {
    // 3×3 + 3×3 이지만 2×2가 겹친다 → 9 + 9 - 4
    expect(
      unionCellCount([rectOf(11420, 16858, 3, 3), rectOf(11421, 16859, 3, 3)]),
    ).toBe(14);
  });

  it("완전히 포함되는 사각형을 더해도 칸 수가 늘지 않는다 (AC 5 경계)", () => {
    expect(
      unionCellCount([rectOf(11420, 16858, 3, 3), rectOf(11421, 16859, 1, 1)]),
    ).toBe(9);
  });
});

describe("judgeCandidate — 상한 차단·한 변 경고 판정 (AC 7·8)", () => {
  it("합집합이 상한(81칸)과 같으면 추가할 수 있다 (AC 7 경계)", () => {
    const judgement = judgeCandidate([], rectOf(11420, 16858, 9, 9));

    expect(judgement.unionAfter).toBe(AREA_CELL_LIMIT);
    expect(judgement.blocked).toBe(false);
  });

  it("합집합이 81칸을 넘는 후보는 차단된다 (AC 7)", () => {
    const judgement = judgeCandidate(
      [rectOf(11420, 16858, 9, 9)],
      rectOf(11440, 16878, 1, 1),
    );

    expect(judgement.unionAfter).toBe(82);
    expect(judgement.blocked).toBe(true);
  });

  it("확정 영역과 겹치는 후보는 합집합 기준으로 판정된다 (AC 5·7)", () => {
    // 9×9 확정 안에 완전히 들어가는 후보 → 합집합이 늘지 않아 차단되지 않는다
    const judgement = judgeCandidate(
      [rectOf(11420, 16858, 9, 9)],
      rectOf(11421, 16859, 2, 2),
    );

    expect(judgement.unionAfter).toBe(AREA_CELL_LIMIT);
    expect(judgement.blocked).toBe(false);
  });

  it("한 변이 10칸을 넘으면 경고하되 차단하지 않는다 (AC 8)", () => {
    const judgement = judgeCandidate([], rectOf(11420, 16858, 11, 7));

    expect(judgement.sideWarning).toBe(true);
    expect(judgement.blocked).toBe(false);
  });

  it("한 변이 정확히 10칸이면 경고하지 않는다 (AC 8 경계)", () => {
    const judgement = judgeCandidate(
      [],
      rectOf(11420, 16858, SIDE_WARN_CELLS, 8),
    );

    expect(judgement.sideWarning).toBe(false);
    expect(judgement.blocked).toBe(false);
  });

  it("상한 초과와 한 변 초과가 겹치면 차단이 경고보다 우선한다 (AC 8)", () => {
    const judgement = judgeCandidate([], rectOf(11420, 16858, 11, 9));

    expect(judgement.blocked).toBe(true);
    expect(judgement.sideWarning).toBe(false);
  });
});

describe("candidateIssueMessage — 차단·경고 사유 문구 (AC 7·8)", () => {
  it("상한을 넘는 후보는 삭제 후 재시도를 안내한다 (AC 7)", () => {
    const message = candidateIssueMessage(
      judgeCandidate([rectOf(11420, 16858, 9, 9)], rectOf(11440, 16878, 1, 1)),
    );

    expect(message).toBe(
      "상한 초과 — 아래 목록에서 영역을 삭제한 뒤 다시 추가해 주세요",
    );
  });

  it("한 변이 10칸을 넘는 후보는 경고 문구를 돌려준다 (AC 8)", () => {
    const message = candidateIssueMessage(
      judgeCandidate([], rectOf(11420, 16858, 11, 7)),
    );

    expect(message).toBe(
      "한 변이 10칸을 넘어요 — 심사 단계에서 조정될 수 있어요",
    );
  });

  it("문제 없는 후보는 사유가 없다 (AC 7·8)", () => {
    expect(
      candidateIssueMessage(judgeCandidate([], rectOf(11420, 16858, 3, 3))),
    ).toBeNull();
  });
});

describe("rectCornersAt — 사각형 → 지도 꼭짓점 파생 (AC 14)", () => {
  it("남서→남동→북동→북서 순서로 min 교점과 max+1 경계 교점을 조합한다", () => {
    const corners = rectCornersAt(rectOf(11420, 16858, 4, 3));

    expect(corners).toEqual([
      gridNodeAt({ gridX: 11420, gridY: 16858 }),
      gridNodeAt({ gridX: 11424, gridY: 16858 }),
      gridNodeAt({ gridX: 11424, gridY: 16861 }),
      gridNodeAt({ gridX: 11420, gridY: 16861 }),
    ]);
  });

  it("1×1 사각형의 꼭짓점은 그 셀의 꼭짓점 4점과 같다 (경계)", () => {
    const corners = rectCornersAt(rectOf(11420, 16858, 1, 1));

    expect(corners).toEqual(cellCornersAt({ gridX: 11420, gridY: 16858 }));
  });
});
