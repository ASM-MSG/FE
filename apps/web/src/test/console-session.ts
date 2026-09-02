import { envelopeResponse } from "./envelope-response";
import { stubFetch } from "./stub-fetch";

/**
 * 콘솔 세션 fetch 스텁 (MSG-541) — 콘솔 가드·게이트·라우팅 스모크가 공통으로 필요한
 * 두 응답(`GET /api/users/me`의 role, `GET /api/auth/password/status`의 mustChange)을
 * 한 자리에서 공급한다. 같은 라우팅 스텁이 네 파일째 복제되어 추출했다
 * (envelope-response·stub-fetch 선례 — 중복 게이트 검출).
 *
 * MSG-545: 운영자 홈이 실구현되며 콘솔 마운트가 `/api/org/profile`(사이드바)과
 * `/api/org/event-submissions/my`(대시보드)도 부른다 — 두 응답을 빈 상태 형태로 더했다.
 * 대시보드 자체의 데이터 분기는 페이지 스모크가 자기 스텁으로 검증한다.
 */
export const consoleSessionFetch = (
  role: "USER" | "ORG" | "ADMIN",
  { mustChange = false }: { mustChange?: boolean } = {},
) =>
  stubFetch((request) => {
    const { pathname } = new URL(request.url);
    if (pathname === "/api/auth/password/status") {
      return envelopeResponse({ mustChange });
    }
    if (pathname === "/api/org/profile") {
      return envelopeResponse({
        email: "tourism@busan.go.kr",
        contactName: "담당자",
        contactPhone: null,
      });
    }
    if (pathname === "/api/org/event-submissions/my") {
      return envelopeResponse({
        counts: { inReview: 0, approved: 0, rejected: 0 },
        submissions: [],
      });
    }
    return envelopeResponse({
      email: "tourism@busan.go.kr",
      nickname: "부산광역시 관광마이스과",
      profileImageUrl: null,
      createdAt: "2026-08-01T00:00:00Z",
      locationConsent: true,
      role,
    });
  });
