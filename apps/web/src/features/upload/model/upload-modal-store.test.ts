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

  it("게이트에 지목 격자(target)가 있으면 리다이렉트(새 로드) 복귀 후 재개에도 지목이 유지된다 (격자 고정 진입)", async () => {
    const before = await loadSession();
    // 격자 상세 [영상 추가] — 지목 격자와 함께 게이트 진입
    before.uploadStore.getState().openModal({ lat: 35.158, lng: 129.06 });

    const after = await loadSession(); // 카카오 콜백 복귀 — 메모리 소실, 영속 의도만 생존
    after.authStore.getState().setAccessToken("token");

    expect(after.uploadStore.getState().open).toBe(true);
    expect(after.uploadStore.getState().target).toEqual({
      lat: 35.158,
      lng: 129.06,
    });
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

describe("업로드 모달 스토어 — 교체 모드 진입 (MSG-415)", () => {
  const REPLACE_TARGET = {
    videoId: 42,
    gridId: "grid-77",
    zoneName: "서면",
    zoneCell: "A-02",
  };

  beforeEach(() => {
    useUploadModalStore.setState({
      open: false,
      pendingAfterLogin: false,
      target: null,
      replaceTarget: null,
    });
    useLoginModalStore.setState({ open: false });
    // 교체 진입점(내 영상 더보기 메뉴)은 로그인 후 표면 — 게이트 불요
    useAuthStore.setState({ accessToken: "token", isAuthenticated: true });
  });

  it("openReplaceModal은 위저드를 열고 교체 대상(videoId·gridId·격자 라벨)을 저장한다 (AC 2)", () => {
    useUploadModalStore.getState().openReplaceModal(REPLACE_TARGET);

    expect(useUploadModalStore.getState().open).toBe(true);
    expect(useUploadModalStore.getState().replaceTarget).toEqual(
      REPLACE_TARGET,
    );
  });

  it("closeModal은 교체 대상을 해제한다 — 다음 일반 업로드가 교체로 오발사되지 않는다 (AC 6·7)", () => {
    useUploadModalStore.getState().openReplaceModal(REPLACE_TARGET);

    useUploadModalStore.getState().closeModal();

    expect(useUploadModalStore.getState().open).toBe(false);
    expect(useUploadModalStore.getState().replaceTarget).toBeNull();
  });

  it("일반 openModal 진입은 이전 교체 대상을 잇지 않는다 (AC 6)", () => {
    useUploadModalStore.getState().openReplaceModal(REPLACE_TARGET);

    useUploadModalStore.getState().openModal();

    expect(useUploadModalStore.getState().replaceTarget).toBeNull();
  });

  it("openReplaceModal은 지목 격자(target)를 세팅하지 않는다 — 교체 좌표 미전송 원칙 (AC 3)", () => {
    useUploadModalStore.getState().openReplaceModal(REPLACE_TARGET);

    expect(useUploadModalStore.getState().target).toBeNull();
  });
});

describe("업로드 모달 스토어 — 격자 고정 진입 (지목 격자)", () => {
  beforeEach(() => {
    useUploadModalStore.setState({
      open: false,
      pendingAfterLogin: false,
      target: null,
    });
    useLoginModalStore.setState({ open: false });
    useAuthStore.setState({ accessToken: "token", isAuthenticated: true });
  });

  it("격자 상세에서 openModal(target)로 열면 지목 좌표가 저장된다 (AC1)", () => {
    useUploadModalStore.getState().openModal({ lat: 35.158, lng: 129.06 });

    expect(useUploadModalStore.getState().open).toBe(true);
    expect(useUploadModalStore.getState().target).toEqual({
      lat: 35.158,
      lng: 129.06,
    });
  });

  it("일반 진입(openModal 무인자)은 이전 지목을 잇지 않는다 (AC2·AC4)", () => {
    useUploadModalStore.getState().openModal({ lat: 35.158, lng: 129.06 });
    useUploadModalStore.getState().closeModal();

    useUploadModalStore.getState().openModal();

    expect(useUploadModalStore.getState().target).toBeNull();
  });

  it("closeModal은 지목을 해제한다 (AC4)", () => {
    useUploadModalStore.getState().openModal({ lat: 35.158, lng: 129.06 });
    useUploadModalStore.getState().closeModal();

    expect(useUploadModalStore.getState().target).toBeNull();
  });

  it("비로그인 게이트를 거쳐도 로그인 재개 시 지목 격자가 유지된다 (AC3)", () => {
    useAuthStore.setState({ accessToken: null, isAuthenticated: false });

    useUploadModalStore.getState().openModal({ lat: 35.158, lng: 129.06 }); // 게이트
    expect(useUploadModalStore.getState().open).toBe(false);

    useAuthStore.getState().setAccessToken("token"); // 재개

    expect(useUploadModalStore.getState().open).toBe(true);
    expect(useUploadModalStore.getState().target).toEqual({
      lat: 35.158,
      lng: 129.06,
    });
  });
});
