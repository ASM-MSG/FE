/**
 * 운영자·관리자 콘솔 경로의 단일 출처 (MSG-541) — 콘솔 웨이브(MSG-541~555)의 경로 정본이다.
 *
 * 유저 앱의 `ROUTES`(NavKey·getActiveNavKey의 소스)와 **분리해 둔다**: 콘솔 경로가 그쪽에
 * 섞이면 사이드레일 활성 판정(getActiveNavKey)이 콘솔 경로까지 네비 섹션으로 오인한다.
 *
 * 이 파일과 `router.tsx`의 콘솔 서브트리는 웨이브 내 후속 티켓(542~554)의 **수정 금지 대상**이다
 * — 후속 티켓은 자기 스텁 페이지 파일만 실구현으로 교체한다(병렬 워크트리 충돌 방지).
 *
 * 문자열 상수뿐이라 유저 번들에 포함되어도 무해하다 — 콘솔 화면 코드는 lazy 청크에 있다.
 */
export const CONSOLE_ROUTES = {
  // ── 운영자(ORG) 공개 라우트 — 비로그인 접근 가능
  /** 콘솔 로그인 (MSG-542). ADMIN 로그인 진입점도 이 경로를 공용한다 (추정 4) */
  orgLogin: "/org/login",
  /** 비밀번호 재설정 요청·발송 완료 (MSG-542) */
  orgPasswordReset: "/org/password/reset",
  /** 계정 발급 요청 폼·완료 (MSG-543) */
  orgAccountRequest: "/org/account-request",

  // ── 운영자(ORG) 보호 라우트 — 콘솔 세션 전용
  /** 운영자 홈 = 신청 현황 대시보드 (MSG-545) */
  orgHome: "/org",
  /** 첫 로그인 비밀번호 강제 설정 (MSG-542) — mustChange 게이트의 착지 경로 */
  orgPasswordSetup: "/org/password/setup",
  /** 행사 등록 위저드 — 스텝은 위저드 내부 상태다 (MSG-546·547·548, 추정 5) */
  orgSubmissionNew: "/org/submissions/new",
  /** 내 신청 목록 (MSG-549) */
  orgSubmissions: "/org/submissions",
  /** 신청 상세 (MSG-549) */
  orgSubmissionDetail: "/org/submissions/:submissionId",
  /** 반려 재신청 — 위저드 수정 모드 (MSG-550) */
  orgSubmissionEdit: "/org/submissions/:submissionId/edit",
  /** 계정 설정·비밀번호 변경 (MSG-544) */
  orgSettings: "/org/settings",
  /** 등록 가이드 — 대응 티켓 없이 자리표시 존치 (질문 7 (b) 확정) */
  orgGuide: "/org/guide",

  // ── 관리자(ADMIN) 보호 라우트 — ADMIN 외 전부 404 위장
  /** 관리자 인덱스 — 심사 큐로 replace 리다이렉트 (추정 4) */
  adminHome: "/admin",
  /** 관리자 계정 운영 (MSG-551) */
  adminAccounts: "/admin/accounts",
  /** 심사 큐 (MSG-552) */
  adminReview: "/admin/review",
  /** 심사 상세 — 지도 포함 (MSG-553) */
  adminReviewDetail: "/admin/review/:submissionId",
  /** 승인 행사 관리 (MSG-554) */
  adminEvents: "/admin/events",
} as const;
