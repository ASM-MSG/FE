import { StrictMode, type ReactNode } from "react";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  clearRobotsMetas,
  robotsContents,
  robotsMetas,
  seedRobotsMeta,
} from "@/test/robots-meta";
import { useRobotsNoindex } from "./document-meta";

/**
 * `useRobotsNoindex` 훅 계약 (MSG-478 E1 단위) — 정적 셸의 `<meta name="robots">`를
 * 마운트 중 `noindex`로 바꾸고 언마운트 시 원값으로 되돌린다. **메타를 하나 더 만들지
 * 않는다** — robots 메타가 둘이면 크롤러가 어느 쪽을 따를지 보장되지 않는다.
 */
afterEach(clearRobotsMetas);

describe("useRobotsNoindex — 에러 화면 noindex 토글 (E1)", () => {
  it("기존 robots 메타가 있으면 그 content를 noindex로 갱신한다 — 메타는 여전히 1개", () => {
    seedRobotsMeta("index, follow");

    renderHook(() => useRobotsNoindex());

    expect(robotsContents()).toEqual(["noindex"]);
  });

  it("언마운트 시 기존 robots 메타의 content를 원래 값으로 복원한다", () => {
    seedRobotsMeta("index, follow");
    const { unmount } = renderHook(() => useRobotsNoindex());

    unmount();

    expect(robotsContents()).toEqual(["index, follow"]);
  });

  it("robots 메타가 없으면 noindex 메타를 만들고 언마운트 시 제거한다", () => {
    const { unmount } = renderHook(() => useRobotsNoindex());
    expect(robotsContents()).toEqual(["noindex"]);

    unmount();

    expect(robotsMetas()).toHaveLength(0);
  });

  it("StrictMode 이중 실행에서도 메타는 1개·언마운트 후 원값이다", () => {
    seedRobotsMeta("index, follow");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );
    const { unmount } = renderHook(() => useRobotsNoindex(), { wrapper });

    expect(robotsContents()).toEqual(["noindex"]);

    unmount();

    expect(robotsContents()).toEqual(["index, follow"]);
  });
});
