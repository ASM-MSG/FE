import { envelopeResponse } from "./envelope-response";
import { submissionDetail, submissionHistory } from "./org-submission-fixture";
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
 *
 * `overrides`는 특정 경로만 다르게 응답해야 하는 스모크(예: mustChange를 동적으로
 * 뒤집는 MSG-542 게이트 협업 테스트)가 공통 응답을 복제하지 않고 얹는 자리다 —
 * null을 돌려주면 공통 분기로 떨어진다.
 */
/**
 * 신청 상세 3상태 (MSG-549) — 콘솔 마운트가 `/org/submissions/{id}`에서 부르는 상세 응답.
 * id 뒷자리로 상태를 고른다(…2=반려 · …3=승인 · 그 외 심사 중)라 라우팅 스모크와
 * 브라우저 실동작이 상태별 화면을 한 스텁으로 훑을 수 있다.
 */
const consoleSessionDetail = (submissionId: number) => {
  const submittedAt = "2026-09-18T01:24:00";
  const changedAt = "2026-09-19T05:00:00";
  const digit = submissionId % 10;

  if (digit === 2) {
    return submissionDetail({
      id: submissionId,
      status: "REJECTED",
      rejection: {
        reasonCodes: ["PERIOD", "IMAGE"],
        reasonText:
          "행사 기간이 승인 가능한 범위를 넘고 홍보 이미지가 흐립니다.",
      },
      history: [
        submissionHistory({ changedAt: submittedAt }),
        submissionHistory({ status: "REJECTED", changedAt }),
      ],
    });
  }
  if (digit === 3) {
    return submissionDetail({
      id: submissionId,
      status: "APPROVED",
      history: [
        submissionHistory({ changedAt: submittedAt }),
        submissionHistory({ status: "APPROVED", changedAt }),
      ],
    });
  }
  return submissionDetail({ id: submissionId });
};

export const consoleSessionFetch = (
  role: "USER" | "ORG" | "ADMIN",
  {
    mustChange = false,
    overrides,
  }: {
    mustChange?: boolean;
    overrides?: (request: Request) => Response | null;
  } = {},
) =>
  stubFetch((request) => {
    const overridden = overrides?.(request);
    if (overridden) {
      return overridden;
    }
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
    const detailMatch = /^\/api\/org\/event-submissions\/(\d+)$/.exec(pathname);
    if (detailMatch) {
      return envelopeResponse(consoleSessionDetail(Number(detailMatch[1])));
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
