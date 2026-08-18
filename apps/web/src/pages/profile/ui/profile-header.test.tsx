import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { stubInstantLoadImage } from "@/test/instant-load-image";
import { ProfileHeader } from "./ProfileHeader";

/**
 * ProfileHeader 메타 라벨 단위 테스트 (MSG-322 리뷰 반영 → MSG-329 병합 재기준화).
 * MSG-329는 가입일 줄을 명세 부재로 걷어냈으나, 서버 createdAt이 생겨(MSG-373)
 * MSG-378의 "가입일(KST) + 이메일" 메타 라벨을 정본으로 복원했다 — email null(카카오
 * 가입) 세그먼트 생략과 email 제공 표기를 모두 여기서 고정한다 (A2).
 *
 * [MSG-378 기준 16] 아바타는 avatarSrc 이미지를 표시하고 닉네임 첫 글자 fallback은
 * 더 이상 렌더하지 않는다 — 기본 이미지 폴백(null → DEFAULT_PROFILE_IMAGE) 배선은
 * ProfilePanel 몫이라 패널 스모크가 단정한다.
 */
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderHeader = ({
  email = null as string | null,
  avatarSrc = "https://cdn.example/me.png",
} = {}) =>
  render(
    <ProfileHeader
      nickname="필맵퍼"
      email={email}
      joinedDateLabel="2026.05.12"
      // 대표 미설정 — 메타 줄 폴백 경로가 이 파일의 고정 범위 (pill 대체는 패널 스모크 몫, ADHOC)
      featuredBadges={[]}
      avatarSrc={avatarSrc}
    />,
  );

describe("ProfileHeader 메타 라벨", () => {
  it("email null이면 가입일 세그먼트만 표시한다 (MSG-322·A2)", () => {
    renderHeader();
    // 정확 일치 단정 — 분기가 깨지면 "가입일 2026.05.12 · null"이 렌더되어 실패한다
    expect(screen.getByText("가입일 2026.05.12")).toBeTruthy();
    expect(screen.queryByText(/·/)).toBeNull();
  });

  it("email이 있으면 '가입일 · 이메일' 세그먼트로 표시된다 (A1)", () => {
    renderHeader({ email: "fillmapper@fillmap.app" });
    expect(
      screen.getByText("가입일 2026.05.12 · fillmapper@fillmap.app"),
    ).toBeTruthy();
  });
});

describe("ProfileHeader 아바타 (MSG-378 기준 16)", () => {
  it("avatarSrc 이미지를 아바타로 표시하고, 닉네임 첫 글자 fallback은 렌더하지 않는다", async () => {
    stubInstantLoadImage();
    renderHeader({ avatarSrc: "https://cdn.fillmap.kr/profile/42.png" });

    const avatar = (await screen.findByAltText("필맵퍼")) as HTMLImageElement;
    expect(avatar.src).toBe("https://cdn.fillmap.kr/profile/42.png");
    // 구 avatarFallback("필") 대체 확인 — 첫 글자 텍스트가 어디에도 없다
    expect(screen.queryByText("필")).toBeNull();
  });
});
