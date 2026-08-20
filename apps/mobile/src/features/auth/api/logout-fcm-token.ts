import type { LogoutData } from "../../../shared/api/sdk";

/**
 * 로그아웃 시 FCM 토큰 정리 (MSG-429 기준 17) — 웹 MSG-408 기준 9 미러.
 *
 * `POST /api/auth/logout`은 body의 `fcmToken`을 받으면 푸시 토큰까지 한 번에 정리한다
 * (명세 주석: MSG-178 logout 통합). 이걸 안 보내면 **로그아웃한 계정으로 다음 사용자의
 * 기기에 푸시가 계속 간다.**
 *
 * 보관 비우기는 **성공·실패와 무관**하다 — 로컬 세션이 끊기면 이 토큰으로 할 수 있는
 * 일이 없고, 남겨 두면 다음 로그인 사용자의 토글이 남의 토큰을 등록된 것으로 오인한다.
 * (해제 실패에 보관을 유지하는 `disablePush`와 정반대인 이유: 그쪽은 재해제 경로를 남겨야
 * 하지만 여기는 그 경로 자체가 사라진다.)
 *
 * 의존은 주입받는다 — 저장소 어댑터를 직접 물면 이 판정을 테스트할 수 없다.
 */
export interface LogoutTokenDeps {
  readStoredToken: () => Promise<string | null>;
  clearStoredToken: () => Promise<void>;
}

/** 보관 토큰 → 로그아웃 요청 옵션. 없으면 빈 객체(= body 없이 호출, 기존 동작) */
export const buildLogoutBody = (
  storedToken: string | null,
): Pick<LogoutData, "body"> | Record<string, never> =>
  storedToken === null ? {} : { body: { fcmToken: storedToken } };

/** 보관 토큰을 읽어 body를 만들고 보관을 비운다 — 읽기 실패는 "보관 없음"으로 접는다 */
export const settleLogoutToken = async (
  deps: LogoutTokenDeps,
): Promise<Pick<LogoutData, "body"> | Record<string, never>> => {
  let storedToken: string | null = null;
  try {
    storedToken = await deps.readStoredToken();
  } catch {
    storedToken = null;
  }
  await deps.clearStoredToken();
  return buildLogoutBody(storedToken);
};
