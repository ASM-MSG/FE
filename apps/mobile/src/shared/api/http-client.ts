import ky from "ky";
import { authAfterResponse, authBeforeRequest } from "./auth-pipeline";

/**
 * FillMap 모바일 API 공용 Ky 인스턴스 — 생성 클라이언트에 fetch로 주입된다 (client-config.ts).
 *
 * - `throwHttpErrors: false`: hey-api는 fetch 시맨틱(에러 응답도 resolve)을 기대한다.
 * - `retry: 0`: 재시도는 TanStack Query 단층에서만 (이중 곱셈 방지 — query-provider).
 *   401 재발급 후 1회 재시도는 auth-pipeline의 afterResponse 훅 소관.
 * - 웹과 달리 `credentials: "include"`가 없다 — 앱은 쿠키 리프레시를 쓰지 않고
 *   리프레시 토큰을 body로 주고받는다(생성 타입 명세의 앱 클라이언트 규약).
 *
 * RN 호환: ky는 ReadableStream·AbortSignal.any 등을 모듈 로드 시 feature-detect하므로
 * 두 전역이 없는 RN(Hermes + whatwg-fetch)에서도 동작한다 — auth-pipeline.test의
 * "RN 런타임 제약" 케이스가 이를 고정한다(실기 확증은 dev client 스모크).
 */
export const httpClient = ky.create({
  throwHttpErrors: false,
  retry: 0,
  hooks: {
    beforeRequest: [authBeforeRequest],
    afterResponse: [authAfterResponse],
  },
});
