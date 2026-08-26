/**
 * 문서 제목 정본 (MSG-478 C1) — 라우트별 `document.title` 문자열을 만든다.
 * 웹 문서 제목 전용이라 RN 재사용 대상이 아니지만, 이 앱에서만 쓰는 유틸이므로 shared/에 둔다.
 */

/** 브랜드명 — 라우트 제목의 접미사 */
export const SITE_NAME = "필맵";

/**
 * 홈(`/`)의 문서 제목. `index.html`의 `<title>`과 **같은 문자열이어야 한다** — 정적 셸(검색 결과·
 * 첫 탭)과 런타임 복원값이 어긋나지 않도록 document-title.test가 fs로 대조한다.
 * 문구를 바꿀 때는 index.html의 `<title>`·`og:title`·`twitter:title`과 함께 고친다.
 */
export const SITE_TITLE = "필맵 FillMap — 우리 동네를 영상으로 채워가는 지도";

/** 라우트 화면명 → "{화면명} | 필맵" */
export const formatDocumentTitle = (screenName: string): string =>
  `${screenName} | ${SITE_NAME}`;
