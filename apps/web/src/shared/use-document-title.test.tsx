import { StrictMode, type ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useDocumentTitle } from "./use-document-title";

/**
 * `useDocumentTitle` 훅 계약 (MSG-478 C2) — 설정·갱신·언마운트 복원.
 * 복원 기준은 **마운트 직전 값**이다: 홈(index.html 제목)에서 도감으로 갔다가 돌아오면
 * 홈이 제목을 다시 세우지 않아도 정적 셸 제목으로 되돌아와야 한다.
 */
const ORIGINAL = "마운트 전 제목";

beforeEach(() => {
  document.title = ORIGINAL;
});

afterEach(() => {
  document.title = "";
});

describe("useDocumentTitle — 문서 제목 설정·갱신·복원 (C2)", () => {
  it("마운트 시 document.title을 인자로 설정한다", () => {
    renderHook(() => useDocumentTitle("도감 | 필맵"));

    expect(document.title).toBe("도감 | 필맵");
  });

  it("인자가 바뀌면 제목이 갱신된다", () => {
    const { rerender } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: "도감 | 필맵" },
    });

    rerender({ title: "프로필 | 필맵" });

    expect(document.title).toBe("프로필 | 필맵");
  });

  it("언마운트 시 마운트 직전 값으로 복원한다 — 인자가 바뀐 뒤에도 원래 값이다", () => {
    const { rerender, unmount } = renderHook(
      ({ title }) => useDocumentTitle(title),
      { initialProps: { title: "도감 | 필맵" } },
    );
    rerender({ title: "프로필 | 필맵" });

    unmount();

    expect(document.title).toBe(ORIGINAL);
  });

  it("StrictMode 이중 실행(mount→cleanup→mount)에서도 설정값·복원값이 같다", () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );
    const { unmount } = renderHook(() => useDocumentTitle("도감 | 필맵"), {
      wrapper,
    });

    expect(document.title).toBe("도감 | 필맵");

    unmount();

    expect(document.title).toBe(ORIGINAL);
  });
});
