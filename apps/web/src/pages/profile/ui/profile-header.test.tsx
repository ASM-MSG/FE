import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ProfileHeader } from "./ProfileHeader";

/**
 * ProfileHeader 메타 라벨 단위 테스트 (MSG-322 리뷰 반영).
 * email null(카카오 가입 — 명세 계약) 분기는 mock 단계에서 도달 불가라
 * 스모크가 커버하지 못한다 — 실연동(MSG-323~329) 전 회귀 방지로 여기서 고정한다.
 * email 제공 경로는 profile-panel.smoke가 mock으로 커버하므로 중복 단정하지 않는다.
 */
afterEach(cleanup);

describe("ProfileHeader 메타 라벨", () => {
  it("email null이면 가입일 세그먼트만 표시한다 (MSG-322)", () => {
    render(
      <ProfileHeader
        nickname="필맵퍼"
        email={null}
        joinedDateLabel="2026.05.12"
      />,
    );
    // 정확 일치 단정 — 분기가 깨지면 "가입일 2026.05.12 · null"이 렌더되어 실패한다
    expect(screen.getByText("가입일 2026.05.12")).toBeTruthy();
    expect(screen.queryByText(/·/)).toBeNull();
  });
});
