import {
  decideSyncAction,
  type PushPermissionStatus,
} from "../model/push-registration";

/**
 * 푸시 등록·해제·동기화 오케스트레이션 (MSG-429 기준 14·15).
 *
 * 네이티브 모듈(`expo-notifications`)·저장소·SDK를 **전부 주입받는다** — 어댑터를 직접
 * import하면 vitest가 `expo-notifications`를 파싱하다 죽고(스펙 R6), 그러면 "무엇이 어떤
 * 순서로 나가는가"를 고정할 수단이 실기밖에 남지 않는다. 훅(`use-push-registration`)은
 * 실제 구현을 묶어 넣는 얇은 층이다 — MSG-426이 세운 "옵션 팩토리 + 얇은 훅" 관례의 변형.
 */
export interface PushDeps {
  readPermission: () => Promise<PushPermissionStatus>;
  requestPermission: () => Promise<PushPermissionStatus>;
  readDeviceToken: () => Promise<string>;
  readStoredToken: () => Promise<string | null>;
  saveStoredToken: (token: string) => Promise<void>;
  clearStoredToken: () => Promise<void>;
  registerToken: (token: string) => Promise<void>;
  unregisterToken: (token: string) => Promise<void>;
}

export type EnablePushResult =
  | { status: "enabled" }
  /** 권한 거부 — 토글은 OFF로 남고 화면이 설정 안내를 띄운다 (기준 15) */
  | { status: "denied" }
  /** 토큰 취득·서버 등록 실패 — 재시도 가능한 상태 */
  | { status: "failed" };

/**
 * 토글 ON (기준 14·15). 권한이 아직이면 **이 호출 안에서** 요청한다 — 사용자 제스처
 * 컨텍스트를 벗어나면 안 되기 때문이다(승인 D2). 이미 `denied`면 다시 묻지 않는다:
 * OS가 두 번째부터 프롬프트를 띄우지 않아 사용자에게는 "눌러도 아무 일이 없는" 상태가 된다.
 *
 * 보관(`saveStoredToken`)은 **서버 등록 성공 이후에만** 한다. 먼저 보관하면 등록이 실패한
 * 토큰이 ON으로 보이고(표시 정본이 보관 토큰이다), 서버에는 없는 토큰을 해제하려 든다.
 *
 * **총함수다 — 절대 거부하지 않는다** (PR #78 리뷰 ①). 권한 판독·요청도 네이티브 모듈
 * 접점이라 모듈이 빠진 빌드에서 던진다(D2와 같은 실패면). 거부가 새어 나가면 호출 훅의
 * busy 해제가 실행되지 않아 **토글이 영구히 잠긴다.**
 */
export const enablePush = async (deps: PushDeps): Promise<EnablePushResult> => {
  try {
    const current = await deps.readPermission();
    if (current === "denied") return { status: "denied" };
    const permission =
      current === "granted" ? current : await deps.requestPermission();
    if (permission !== "granted") return { status: "denied" };

    const token = await deps.readDeviceToken();
    await deps.registerToken(token);
    await deps.saveStoredToken(token);
    return { status: "enabled" };
  } catch {
    return { status: "failed" };
  }
};

export type DisablePushResult = { status: "disabled" } | { status: "failed" };

/**
 * 토글 OFF (기준 14). 해제 **성공 시에만** 보관을 비운다 — 실패에 비우면 서버에 등록이
 * 남은 채로 재해제 경로(보관 토큰 전제)가 영구 소멸한다(웹 MSG-408 기준 7이 codex 리뷰로
 * 같은 정정을 받았다). 보관 토큰이 없으면 해제할 대상도 없으므로 서버를 부르지 않는다.
 */
export const disablePush = async (
  deps: PushDeps,
): Promise<DisablePushResult> => {
  try {
    const stored = await deps.readStoredToken();
    if (stored === null) return { status: "disabled" };
    await deps.unregisterToken(stored);
    await deps.clearStoredToken();
    return { status: "disabled" };
  } catch {
    // 보관 읽기 실패도 여기로 온다 — 해제 대상을 모르니 서버 호출 없이 실패로 접는다
    return { status: "failed" };
  }
};

/**
 * 조작 결과 → 토글 표시 상태 (PR #78 리뷰 ②).
 *
 * 순진하게 `status === "enabled"`로 쓰면 **OFF 실패에서 표시가 실제와 반대가 된다.**
 * `disablePush` 실패는 보관 토큰을 **의도적으로 유지**하므로(재해제 경로 보존 — 위 주석)
 * 서버 등록이 살아 있고 푸시는 계속 온다. 그때 OFF로 보이면 "껐는데 알림이 온다"가 되고,
 * 화면을 나갔다 들어오면 재판독으로 ON으로 되돌아와 사용자에겐 토글이 제멋대로 보인다.
 *
 * 판정을 훅에 두지 않고 순수 함수로 뺀 이유는 이 티켓의 다른 판정들과 같다 — 모바일에는
 * 훅·렌더 테스트 인프라가 없어 화면에 두면 회귀를 잡을 자산이 실기뿐이 된다.
 */
export const resolveToggleDisplay = (
  requested: boolean,
  status: EnablePushResult["status"] | DisablePushResult["status"],
): boolean => (requested ? status === "enabled" : status === "failed");

/**
 * 상주 자동 동기화 (기준 14) — **기존 등록자 한정**이다. 보관 토큰이 없으면 권한도 묻지
 * 않고 등록도 하지 않는다(등록 진입점은 프로필 토글뿐 — 승인 D2). 토큰이 로테이션됐으면
 * 구토큰을 해제하고 신규를 등록·보관한다.
 *
 * 실패는 전부 삼킨다 — 앱 기동 경로에서 도는 부수 작업이라 여기서 던지면 화면이 죽는다.
 */
export const syncPushToken = async (
  deps: PushDeps,
  isAuthenticated: boolean,
): Promise<void> => {
  if (!isAuthenticated) return;
  const stored = await deps.readStoredToken();
  if (stored === null) return;
  if ((await deps.readPermission()) !== "granted") return;

  try {
    const fresh = await deps.readDeviceToken();
    const action = decideSyncAction(stored, fresh);
    if (action.type === "none") return;
    if (action.type === "rotate") {
      await deps.unregisterToken(action.staleToken);
    }
    await deps.registerToken(action.token);
    await deps.saveStoredToken(action.token);
  } catch {
    // 자동 동기화 실패는 앱 기동을 막지 않는다 — 다음 기동·토글 조작에서 자기 수복된다
  }
};
