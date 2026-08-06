import ky from "ky";

/**
 * FillMap API 공용 Ky 인스턴스 — hey-api 클라이언트에 fetch로 주입된다 (client-config.ts).
 *
 * - `throwHttpErrors: false`: hey-api는 fetch 시맨틱(에러 응답도 resolve)을 기대한다.
 *   HTTP 에러 판정·봉투 파싱은 hey-api 클라이언트 계층 담당.
 * - `retry: 0`: 재시도는 TanStack Query 단층에서만 수행한다 (이중 곱셈 방지 — QueryProvider).
 *
 * MSG-324(인증 헤더 주입·401 재발급)는 이 인스턴스에 hooks(beforeRequest·afterResponse)만
 * 추가하면 되는 단일 확장 지점이다.
 */
export const httpClient = ky.create({
  throwHttpErrors: false,
  retry: 0,
});
