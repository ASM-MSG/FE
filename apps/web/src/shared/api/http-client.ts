import ky from "ky";
import { authAfterResponse, authBeforeRequest } from "./auth-pipeline";

/**
 * FillMap API 공용 Ky 인스턴스 — hey-api 클라이언트에 fetch로 주입된다 (client-config.ts).
 *
 * - `throwHttpErrors: false`: hey-api는 fetch 시맨틱(에러 응답도 resolve)을 기대한다.
 *   HTTP 에러 판정·봉투 파싱은 hey-api 클라이언트 계층 담당.
 * - `retry: 0`: 재시도는 TanStack Query 단층에서만 수행한다 (이중 곱셈 방지 — QueryProvider).
 *   401 재발급 후 1회 재시도는 Ky retry가 아니라 auth-pipeline의 afterResponse 훅 소관.
 * - `credentials: "include"`: HttpOnly 쿠키 리프레시 토큰 전송·수신 (MSG-324 수용 기준 6).
 * - hooks: 인증 파이프라인(MSG-324) — 토큰 주입(beforeRequest)·401 재발급(afterResponse).
 */
export const httpClient = ky.create({
  throwHttpErrors: false,
  retry: 0,
  credentials: "include",
  hooks: {
    beforeRequest: [authBeforeRequest],
    afterResponse: [authAfterResponse],
  },
});
