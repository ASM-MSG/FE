import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { handleSessionExpired } from "./configure-auth";

/**
 * 세션 만료 처리 계약 (MSG-325).
 * 로그인 모달이 뜨는 유일한 조건은 **프로필 진입(사이드레일 클릭·/profile 직접 진입)** 이고,
 * 그 판정은 SideRailNav·RequireAuth가 한다. 401은 화면 어디서든 발생할 수 있어
 * 여기서 모달을 열면 사용자가 부르지 않은 모달이 뜬다.
 */
describe("handleSessionExpired — 세션 만료 (재발급 실패)", () => {
  beforeEach(() => {
    useAuthStore.setState({ accessToken: "expired", isAuthenticated: true });
    useLoginModalStore.setState({ open: false });
  });

  it("토큰을 비운다 — 만료된 세션이 로그인 상태로 남지 않는다", () => {
    handleSessionExpired();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().accessToken).toBeNull();
  });

  it("로그인 모달을 열지 않는다 — 비로그인 상태의 지도 조회가 뷰포트마다 401을 내도 모달이 뜨면 안 된다", () => {
    handleSessionExpired();

    expect(useLoginModalStore.getState().open).toBe(false);
  });

  it("이미 열려 있던 모달을 닫지도 않는다 — 모달 열림/닫힘은 프로필 진입 흐름의 소관이다", () => {
    useLoginModalStore.setState({ open: true });

    handleSessionExpired();

    expect(useLoginModalStore.getState().open).toBe(true);
  });
});
