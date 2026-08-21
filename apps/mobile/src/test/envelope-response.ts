/**
 * 테스트 전용 헬퍼 — 백엔드 공통 봉투 응답을 만든다 (웹 `src/test/envelope-response.ts` 대응).
 * fetch 목을 쓰는 모바일 테스트가 셋 이상이라(auth-pipeline·configure-auth·error-interceptor)
 * 처음부터 공용으로 둔다.
 */
export const envelopeResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ developCode: 0, message: "ok", data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** 실패 응답 — 백엔드 공통 에러 봉투 (인터셉터가 ApiError로 정규화한다) */
export const errorEnvelope = (
  developCode: number,
  message: string,
  status: number,
) =>
  new Response(JSON.stringify({ developCode, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
