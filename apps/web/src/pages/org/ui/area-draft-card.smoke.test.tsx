import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  judgeCandidate,
  type AreaRect,
} from "@/features/event-submission/model/submission-area";
import { AreaDraftCard } from "./AreaDraftCard";

/**
 * "방금 드래그한 영역" 카드 스모크 (MSG-547 AC 2·4·5·7·8) — 후보 크기·추가 예고 표시와
 * 추가/취소 콜백, 상한 차단(비활성 + 사유)·한 변 경고(허용) 계약만 고정한다.
 * 판정 값 자체는 순수 모델 테스트(submission-area)가 촘촘히 본다.
 */

/** 서면 격자 인덱스 기준 사각형 — 원점을 옮겨 겹치지 않는 사각형을 만든다 */
const rectOf = (cols: number, rows: number, shift = 0): AreaRect => ({
  minGridX: 11420 + shift,
  maxGridX: 11420 + shift + cols - 1,
  minGridY: 16858 + shift,
  maxGridY: 16858 + shift + rows - 1,
});

/** 9×9(81칸) 확정 영역 — 상한을 이미 채운 상태 */
const FULL_CONFIRMED = [rectOf(9, 9)];

const renderCard = (
  confirmed: AreaRect[],
  candidate: AreaRect,
  handlers: { onAdd?: () => void; onCancel?: () => void } = {},
) =>
  render(
    <AreaDraftCard
      rect={candidate}
      judgement={judgeCandidate(confirmed, candidate)}
      onAdd={handlers.onAdd ?? (() => {})}
      onCancel={handlers.onCancel ?? (() => {})}
    />,
  );

describe("방금 드래그한 영역 카드 (AC 2·4·5·7·8)", () => {
  afterEach(() => cleanup());

  it("후보 크기와 추가 후 합집합 칸 수가 보인다 (AC 2)", () => {
    renderCard([rectOf(3, 3)], rectOf(4, 3, 20));

    expect(screen.getByText("가로 4칸 × 세로 3칸 · 12칸")).toBeDefined();
    expect(screen.getByText("추가하면 21 / 81칸")).toBeDefined();
  });

  it("'+ 영역 추가'를 누르면 후보 확정이 요청된다 (AC 5)", () => {
    const onAdd = vi.fn();
    renderCard([], rectOf(3, 3), { onAdd });

    fireEvent.click(screen.getByRole("button", { name: "+ 영역 추가" }));

    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("'드래그 취소 · Esc'를 누르면 후보가 해제된다 (AC 4)", () => {
    const onCancel = vi.fn();
    renderCard([], rectOf(3, 3), { onCancel });

    fireEvent.click(screen.getByRole("button", { name: "드래그 취소 · Esc" }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("합집합이 81칸을 넘는 후보는 추가가 비활성이고 사유가 안내된다 (AC 7)", () => {
    renderCard(FULL_CONFIRMED, rectOf(2, 2, 20));

    expect(
      screen
        .getByRole("button", { name: "+ 영역 추가" })
        .hasAttribute("disabled"),
    ).toBe(true);
    expect(
      screen.getByText(
        "상한 초과 — 아래 목록에서 영역을 삭제한 뒤 다시 추가해 주세요",
      ),
    ).toBeDefined();
  });

  it("한 변이 10칸을 넘는 후보는 경고가 보이지만 추가할 수 있다 (AC 8)", () => {
    renderCard([], rectOf(11, 7));

    expect(
      screen.getByText(
        "한 변이 10칸을 넘어요 — 심사 단계에서 조정될 수 있어요",
      ),
    ).toBeDefined();
    expect(
      screen
        .getByRole("button", { name: "+ 영역 추가" })
        .hasAttribute("disabled"),
    ).toBe(false);
  });
});
