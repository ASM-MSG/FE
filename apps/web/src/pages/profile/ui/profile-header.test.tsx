import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProfileHeader } from "./ProfileHeader";

/**
 * ProfileHeader 이메일 줄 단위 테스트 (MSG-322 → MSG-329 A2·A4 재설계).
 * 실 API 전환으로 가입일 줄이 사라졌다(명세 부재, A4) — 구 "가입일 세그먼트" 단정 폐기.
 * email null(카카오 가입) 분기는 이메일 줄 자체를 렌더하지 않아야 한다 (A2 —
 * 빈 문자열·"—" 렌더 회귀 방지).
 */
afterEach(cleanup);

describe("ProfileHeader 이메일 줄 (A2)", () => {
  it("email이 null이면 이메일 줄이 렌더되지 않는다 — 닉네임만 남는다", () => {
    const { container } = render(
      <ProfileHeader nickname="필맵퍼" email={null} />,
    );

    expect(screen.getByText("필맵퍼")).toBeTruthy();
    // 닉네임 외 텍스트 줄(p)이 없다 — 빈 문자열·"—" 자리표시 렌더 금지
    expect(container.querySelectorAll("p")).toHaveLength(1);
  });

  it("email이 있으면 이메일 줄이 표시된다 (A1)", () => {
    render(<ProfileHeader nickname="필맵퍼" email="fillmapper@fillmap.app" />);

    expect(screen.getByText("fillmapper@fillmap.app")).toBeTruthy();
  });
});
