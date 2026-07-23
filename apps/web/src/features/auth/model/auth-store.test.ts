import { beforeEach, describe, expect, it } from "vitest";
import { webStorage } from "@/shared/storage";
import { AUTH_STORAGE_KEY, createAuthStore, useAuthStore } from "./auth-store";

/**
 * 목 인증 스토어 (MSG-46 후속 3 P1, test-first) — F1의 "비영속" 계약을 영속화로 대체.
 * codex 지적("테스트가 수동 상태 설정으로 비영속을 가림") 해소: 수동 setState가 아니라
 * "이전 세션이 스토리지에 남긴 상태가 새 스토어 생성(=새 로드) 시 재수화된다"를 직접
 * 단정한다. 스토리지 접근은 shared/storage 어댑터 경유 — localStorage 직접 참조는
 * RN 경계 lint가 막는다.
 */
describe("목 인증 스토어 영속화 (P1)", () => {
  beforeEach(() => {
    // 싱글턴 상태 초기화 후 스토리지를 비워 "저장된 세션 없음"에서 시작한다
    useAuthStore.setState({ isAuthenticated: true });
    webStorage.removeItem(AUTH_STORAGE_KEY);
  });

  it("저장된 세션이 없는 첫 로드의 초기값은 로그인 상태(true)다 — 데모 기본값", () => {
    const freshLoad = createAuthStore();

    expect(freshLoad.getState().isAuthenticated).toBe(true);
  });

  it("logout() 호출 시 로그아웃 상태(false)로 바뀐다", () => {
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("로그아웃 후 새 로드(새 스토어 재수화)에도 로그아웃이 유지된다 — 가드가 새 로드를 실제로 막는 전제 (P1)", () => {
    useAuthStore.getState().logout();

    // 새 로드 의미론: 초기값 true로 생성되는 새 스토어가 스토리지에서 false를 재수화한다
    const nextLoad = createAuthStore();

    expect(nextLoad.getState().isAuthenticated).toBe(false);
  });

  it("login() 후 새 로드에도 로그인이 유지된다 — 카카오 목 로그인 루프의 영속 (P1·P2)", () => {
    useAuthStore.getState().logout();
    useAuthStore.getState().login();

    const nextLoad = createAuthStore();

    expect(nextLoad.getState().isAuthenticated).toBe(true);
  });
});
