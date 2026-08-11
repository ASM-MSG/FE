import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AUTH_STORAGE_KEY,
  useAuthStore,
} from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { uploadIntentStorage, webStorage } from "@/shared/storage";
import { useUploadModalStore } from "./upload-modal-store";

/**
 * 업로드 모달 열기 게이트 (MSG-352 C9, test-first).
 * 두 진입점(사이드레일·지도 FAB)이 모두 openModal만 호출하므로,
 * 진입점별 분기 대신 열기 액션 자체를 게이트한다 — 새 진입점도 자동 적용.
 */
describe("업로드 모달 스토어 — 비로그인 게이트 (C9)", () => {
  beforeEach(() => {
    useUploadModalStore.setState({ open: false, pendingAfterLogin: false });
    useLoginModalStore.setState({ open: false });
    useAuthStore.setState({ accessToken: null, isAuthenticated: false });
  });

  it("비로그인 상태에서 openModal을 호출하면 업로드 위저드 대신 로그인 모달이 열린다", () => {
    useUploadModalStore.getState().openModal();

    expect(useUploadModalStore.getState().open).toBe(false);
    expect(useLoginModalStore.getState().open).toBe(true);
  });

  it("로그인 상태에서는 기존대로 업로드 모달이 열리고 로그인 모달은 열리지 않는다", () => {
    useAuthStore.setState({ accessToken: "token", isAuthenticated: true });

    useUploadModalStore.getState().openModal();

    expect(useUploadModalStore.getState().open).toBe(true);
    expect(useLoginModalStore.getState().open).toBe(false);
  });
});

describe("업로드 모달 스토어 — 로그인 성공 후 자동 재개 (C10)", () => {
  beforeEach(() => {
    useUploadModalStore.setState({ open: false, pendingAfterLogin: false });
    useLoginModalStore.setState({ open: false });
    useAuthStore.setState({ accessToken: null, isAuthenticated: false });
  });

  it("비로그인 게이트 경로에서 로그인에 성공하면 로그인 모달이 닫히고 업로드 위저드가 자동으로 이어서 열린다", () => {
    useUploadModalStore.getState().openModal(); // 게이트 → 로그인 모달 + 의도 기억

    useAuthStore.getState().setAccessToken("token");

    expect(useLoginModalStore.getState().open).toBe(false);
    expect(useUploadModalStore.getState().open).toBe(true);
  });

  it("업로드 의도 없이 로그인하면(프로필 진입 등) 위저드가 열리지 않는다", () => {
    useLoginModalStore.getState().openModal(); // 업로드 게이트를 거치지 않은 로그인 모달

    useAuthStore.getState().setAccessToken("token");

    expect(useUploadModalStore.getState().open).toBe(false);
  });

  it("게이트로 연 로그인 모달을 로그인 없이 닫으면 의도가 해제되어 이후 로그인 시 위저드가 열리지 않는다", () => {
    useUploadModalStore.getState().openModal(); // 게이트 → 의도 기억
    useLoginModalStore.getState().closeModal(); // 취소

    useAuthStore.getState().setAccessToken("token"); // 이후 다른 경로 로그인

    expect(useUploadModalStore.getState().open).toBe(false);
  });
});

describe("업로드 모달 스토어 — 카카오 OAuth 리다이렉트 생존 자동 재개 (C11)", () => {
  /**
   * 새 로드 모사 — 카카오 리다이렉트는 페이지를 떠났다 돌아오므로 모듈 상태(메모리)가
   * 전부 소실되고, 영속화된 업로드 의도(sessionStorage)만 생존한다. vi.resetModules 후
   * 재import로 스토어·구독을 처음부터 다시 만들어 이를 재현한다.
   * 위 describe들의 정적 import 싱글턴과는 별개 인스턴스다.
   */
  const loadSession = async () => {
    vi.resetModules();
    const [upload, login, auth] = await Promise.all([
      import("./upload-modal-store"),
      import("@/features/auth/model/login-modal-store"),
      import("@/features/auth/model/auth-store"),
    ]);
    return {
      uploadStore: upload.useUploadModalStore,
      loginStore: login.useLoginModalStore,
      authStore: auth.useAuthStore,
    };
  };

  beforeEach(() => {
    // 각 케이스는 저장 세션 없는 비로그인 새 탭에서 시작한다 (어댑터 경유 — RN 경계)
    webStorage.removeItem(AUTH_STORAGE_KEY);
    uploadIntentStorage.clear();
  });

  it("게이트로 영속화된 업로드 의도가 리다이렉트(새 로드)를 생존해, 로그인 성공 시 위저드가 자동으로 열린다", async () => {
    const before = await loadSession();
    before.uploadStore.getState().openModal(); // 비로그인 게이트 — 로그인 모달 + 의도 영속화

    const after = await loadSession(); // 카카오 콜백 복귀 — 새 로드
    after.authStore.getState().setAccessToken("token"); // 코드 교환 성공

    expect(after.loginStore.getState().open).toBe(false);
    expect(after.uploadStore.getState().open).toBe(true);
  });

  it("업로드 의도 없이 카카오 로그인만 하면(리다이렉트 복귀) 위저드가 열리지 않는다", async () => {
    const after = await loadSession(); // 의도 영속화 없이 콜백 복귀

    after.authStore.getState().setAccessToken("token");

    expect(after.uploadStore.getState().open).toBe(false);
  });

  it("게이트로 연 로그인 모달을 로그인 없이 닫으면(취소) 영속 의도도 해제된다 — 이후 새 로드의 로그인에도 위저드가 열리지 않는다", async () => {
    const before = await loadSession();
    before.uploadStore.getState().openModal(); // 게이트 — 의도 영속화
    before.loginStore.getState().closeModal(); // 취소

    const after = await loadSession();
    after.authStore.getState().setAccessToken("token");

    expect(after.uploadStore.getState().open).toBe(false);
  });

  it("의도 세팅 후 로그인 없이 이탈했다 복귀하면, 이후 다른 경로(프로필 등)의 로그인에 위저드가 열리지 않는다", async () => {
    const before = await loadSession();
    before.uploadStore.getState().openModal(); // 게이트 — 의도 영속화

    const after = await loadSession(); // 이탈 복귀 — 로그인 모달이 닫힌 새 로드
    after.loginStore.getState().openModal(); // 업로드 게이트가 아닌 다른 경로의 로그인 모달
    after.authStore.getState().setAccessToken("token");

    expect(after.uploadStore.getState().open).toBe(false);
  });

  it("재개된 의도는 소진된다 — 재개 후 새 로드에서 다시 로그인해도 위저드가 또 열리지 않는다", async () => {
    const before = await loadSession();
    before.uploadStore.getState().openModal(); // 게이트 — 의도 영속화

    const resumed = await loadSession();
    resumed.authStore.getState().setAccessToken("token"); // 재개(소진)
    expect(resumed.uploadStore.getState().open).toBe(true);

    webStorage.removeItem(AUTH_STORAGE_KEY); // 로그아웃된 새 탭에서의 재로그인 모사
    const later = await loadSession();
    later.authStore.getState().setAccessToken("token");

    expect(later.uploadStore.getState().open).toBe(false);
  });
});
