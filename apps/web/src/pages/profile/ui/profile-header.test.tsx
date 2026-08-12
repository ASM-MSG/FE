import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubInstantLoadImage } from "@/test/instant-load-image";
import { ProfileHeader } from "./ProfileHeader";

/**
 * ProfileHeader 메타 라벨 단위 테스트 (MSG-322 리뷰 반영).
 * email null(카카오 가입 — 명세 계약) 분기는 mock 단계에서 도달 불가라
 * 스모크가 커버하지 못한다 — 실연동(MSG-323~329) 전 회귀 방지로 여기서 고정한다.
 * email 제공 경로는 profile-panel.smoke가 mock으로 커버하므로 중복 단정하지 않는다.
 *
 * [MSG-378 기준 16] 아바타는 avatarSrc 이미지를 표시하고 닉네임 첫 글자 fallback은
 * 더 이상 렌더하지 않는다 — 기본 이미지 폴백(null → DEFAULT_PROFILE_IMAGE) 배선은
 * ProfilePanel 몫이라 패널 스모크가 단정한다.
 */
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderHeader = (avatarSrc = "https://cdn.example/me.png") =>
  render(
    <ProfileHeader
      nickname="필맵퍼"
      email={null}
      joinedDateLabel="2026.05.12"
      avatarSrc={avatarSrc}
    />,
  );

describe("ProfileHeader 메타 라벨", () => {
  it("email null이면 가입일 세그먼트만 표시한다 (MSG-322)", () => {
    renderHeader();
    // 정확 일치 단정 — 분기가 깨지면 "가입일 2026.05.12 · null"이 렌더되어 실패한다
    expect(screen.getByText("가입일 2026.05.12")).toBeTruthy();
    expect(screen.queryByText(/·/)).toBeNull();
  });
});

describe("ProfileHeader 아바타 (MSG-378 기준 16)", () => {
  it("avatarSrc 이미지를 아바타로 표시하고, 닉네임 첫 글자 fallback은 렌더하지 않는다", async () => {
    stubInstantLoadImage();
    renderHeader("https://cdn.fillmap.kr/profile/42.png");

    const avatar = (await screen.findByAltText("필맵퍼")) as HTMLImageElement;
    expect(avatar.src).toBe("https://cdn.fillmap.kr/profile/42.png");
    // 구 avatarFallback("필") 대체 확인 — 첫 글자 텍스트가 어디에도 없다
    expect(screen.queryByText("필")).toBeNull();
  });
});
