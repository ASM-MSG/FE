import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HomeCellDetail } from "@/features/map-home/model/home-cell-detail";
import { HomeCellDetailPanel } from "./HomeCellDetailPanel";

/**
 * 셀 상세 패널 Escape 배선 스모크 (MSG-252 리뷰 반영 — 2026-07-30).
 * 패널의 window keydown 리스너가 SearchBox 자체 Escape(드롭다운 닫기)와 충돌해
 * 검색창 포커스 상태의 Escape가 드롭다운·상세를 동시에 닫던 결함의 재현 테스트 —
 * 입력 요소가 타깃인 Escape는 무시하고, 일반 타깃의 Escape만 onClose를 호출해야 한다.
 * SearchBox 자체는 범위 밖이라 패널 단독 렌더로 window 버블링만 단정한다.
 */

/** 최소 상세 픽스처 — Escape 배선 단정에는 헤더 메타만 있으면 된다 (서면 목 관례) */
// MSG-253: HomeCellDetail 타입 변경(location·videoCount → subtitle)에 따른 픽스처 갱신만 —
// Escape 단정 2케이스는 불변
// MSG-277 2차: additive 필드(statsLine·locationLabel·lastUploadText·accent) 추가에 따른
// 픽스처 갱신만 — Escape 단정 2케이스는 여전히 불변
// MSG-325: 표시 모델이 실 API 파생으로 바뀌어(결정 B①) 필드가 줄어든 데 따른 픽스처 갱신만 —
// Escape 단정 2케이스는 여전히 불변
const DETAIL: HomeCellDetail = {
  gridId: "39064_112221",
  label: "서면 A-14",
  subtitle: "내 영상 0개",
  badges: [],
  regionLabel: "부산광역시 부산진구 부전1동",
  coverVideo: null,
  accent: "primary",
};

/** onViewAll 필수 prop 신설(MSG-253 AC 11)에 따른 렌더 인자 — Escape 단정과 무관한 no-op */
const noopViewAll = () => {};

describe("홈 셀 상세 패널 Escape 배선", () => {
  afterEach(() => {
    cleanup();
  });

  it("input이 타깃인 Escape는 무시한다 — 검색창 드롭다운 닫기와 동시 닫힘 금지 (리뷰 반영 1)", () => {
    const onClose = vi.fn();
    render(
      <>
        <input aria-label="검색어" />
        <HomeCellDetailPanel
          detail={DETAIL}
          onClose={onClose}
          onViewAll={noopViewAll}
        />
      </>,
    );

    fireEvent.keyDown(screen.getByLabelText("검색어"), { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("일반 타깃(body)의 Escape는 상세를 닫는다 (AC 9-1 보존)", () => {
    const onClose = vi.fn();
    render(
      <HomeCellDetailPanel
        detail={DETAIL}
        onClose={onClose}
        onViewAll={noopViewAll}
      />,
    );

    fireEvent.keyDown(document.body, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
