import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "./auth-store";

/**
 * 목 인증 스토어 (MSG-46 후속 F1, test-first).
 * 실제 인증이 아니라 로그인 페이지·모달 UI 흐름을 보기 위한 데모 스캐폴딩 —
 * OAuth 연동 티켓이 이 스토어를 실인증으로 교체하기 전까지 계약을 고정한다.
 */
describe("목 인증 스토어 (F1)", () => {
  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: true });
  });

  it("초기값은 로그인 상태(true)다", () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("logout() 호출 시 로그아웃 상태(false)로 바뀐다", () => {
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("영속화가 없다 — persist 미들웨어 미사용(새로고침 시 로그인 상태 복원은 목의 의도)", () => {
    // localStorage 검사 대신 persist API 부재를 직접 단정한다 —
    // model 테스트의 localStorage 참조는 RN 경계 lint에 걸린다 (05 리포트 판단 유지)
    expect(
      (useAuthStore as { persist?: unknown }).persist,
    ).toBeUndefined();
  });
});
