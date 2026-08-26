import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SectionPanel } from "./SectionPanel";

/**
 * 섹션 패널 스모크 (MSG-478 C3) — `/upload` 스텁의 탭 제목 계약만 고정한다.
 * 제목은 h1 하나(기존)이고, 패널이 떠 있는 동안 문서 제목이 "{제목} | 필맵"이다.
 */
afterEach(() => {
  cleanup();
  document.title = "";
});

describe("섹션 패널 — 라우트별 문서 제목 (C3)", () => {
  it("업로드 패널이 뜨면 탭 제목이 '업로드 | 필맵'이고 h1은 하나다", () => {
    render(<SectionPanel title="업로드" />);

    expect(document.title).toBe("업로드 | 필맵");
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });
});
