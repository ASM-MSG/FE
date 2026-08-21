import { beforeEach, describe, expect, it } from "vitest";
import { webStorage } from "@/shared/storage";
import { AUTH_STORAGE_KEY, createAuthStore, useAuthStore } from "./auth-store";

/**
 * 실인증 스토어 (MSG-324 수용 기준 10, test-first) — 목 스토어의 "기본 true" 계약을
 * "토큰 유무 유도"로 대체한다. 기존 "데모 기본값 true" 단정의 수정은 티켓 명시 요구
 * ("현행 mock 기본값 true 제거")에 근거한 계약 변경 — 이전 티켓 테스트 불변 원칙의
 * 명시적 예외 (빌드 리포트 기록).
 * 새 로드(재수화) 의미론은 기존과 동일하게 createAuthStore 팩토리로 재현하고,
 * 스토리지 접근은 shared/storage 어댑터 경유(RN 경계).
 */
describe("인증 스토어 — 토큰 유도 (MSG-324 기준 10)", () => {
  beforeEach(() => {
    // 싱글턴을 비로그인 기준선으로 되돌린 뒤 스토리지를 비운다
    useAuthStore.setState({ accessToken: null, isAuthenticated: false });
    webStorage.removeItem(AUTH_STORAGE_KEY);
  });

  it("저장 토큰이 없는 새 로드는 비로그인이다 — mock 기본 true 제거", () => {
    const freshLoad = createAuthStore();

    expect(freshLoad.getState().accessToken).toBeNull();
    expect(freshLoad.getState().isAuthenticated).toBe(false);
  });

  it("setAccessToken() 저장 시 isAuthenticated가 true로 유도된다", () => {
    useAuthStore.getState().setAccessToken("token-a");

    expect(useAuthStore.getState().accessToken).toBe("token-a");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("토큰이 저장된 새 로드는 재수화로 로그인 상태가 된다 — 토큰·인증 모두 복원", async () => {
    useAuthStore.getState().setAccessToken("token-b");

    const nextLoad = createAuthStore();
    // persist 재수화는 비동기일 수 있다 — 완료를 명시적으로 기다린다
    await nextLoad.persist.rehydrate();

    expect(nextLoad.getState().accessToken).toBe("token-b");
    expect(nextLoad.getState().isAuthenticated).toBe(true);
  });

  it("토큰 저장은 shared/storage(webStorage) 어댑터를 경유한다 — 스토리지 키에 토큰이 실린다", () => {
    useAuthStore.getState().setAccessToken("token-c");

    expect(webStorage.getItem(AUTH_STORAGE_KEY)).toContain("token-c");
  });

  it("logout()은 토큰·인증 상태를 비우고, 새 로드에도 비로그인이 유지된다", async () => {
    useAuthStore.getState().setAccessToken("token-d");
    useAuthStore.getState().logout();

    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);

    const nextLoad = createAuthStore();
    await nextLoad.persist.rehydrate();
    expect(nextLoad.getState().isAuthenticated).toBe(false);
  });

  it("구 shape({isAuthenticated: true})의 스토리지는 실토큰이 없으므로 폐기된다 — 비로그인 시작 (추정 5)", async () => {
    // 구 버전(version 0) 목 스토어가 남긴 영속 상태 — 토큰 없는 인증 플래그
    webStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({ state: { isAuthenticated: true }, version: 0 }),
    );

    const migratedLoad = createAuthStore();
    await migratedLoad.persist.rehydrate();

    expect(migratedLoad.getState().accessToken).toBeNull();
    expect(migratedLoad.getState().isAuthenticated).toBe(false);
  });
});
