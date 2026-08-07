/**
 * 테스트 전용 헬퍼 — 백엔드 공통 봉투 응답을 만든다.
 * fetch 목을 쓰는 테스트가 둘 이상 생겨(auth-pipeline·use-auth-mutations) 추출했다.
 */
export const envelopeResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify({ developCode: 0, message: "ok", data }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
