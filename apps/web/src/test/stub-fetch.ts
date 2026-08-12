import { vi } from "vitest";

/**
 * fetch 전역 스텁 (테스트 전용) — hey-api(ky) 경유 Request를 기록하고 라우팅한다.
 * 봉투 헬퍼(envelope-response) 선례처럼 훅 테스트 3곳+가 같은 헬퍼를 복제하게 되어
 * 추출했다 (MSG-329 — 중복 게이트 검출).
 */
export interface ReceivedRequest {
  request: Request;
  /** 파싱된 JSON 바디 — 바디가 없거나 JSON이 아니면 undefined */
  body: unknown;
}

/** 전역 fetch를 라우터로 대체하고, 수신 요청 목록을 반환한다 (vi.unstubAllGlobals로 해제) */
export const stubFetch = (
  route: (request: Request) => Response | Promise<Response>,
): ReceivedRequest[] => {
  const received: ReceivedRequest[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: Request) => {
      const body =
        input.body !== null
          ? await input
              .clone()
              .json()
              .catch(() => undefined)
          : undefined;
      received.push({ request: input, body });
      return route(input);
    }),
  );
  return received;
};
