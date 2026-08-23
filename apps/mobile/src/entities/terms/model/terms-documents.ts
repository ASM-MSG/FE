/**
 * 약관 문서 카탈로그 (MSG-448 기준 1·2·7) — 문서 5종을 뷰어 1개가 공유하는 구조의 정본.
 * 순수 도메인 모듈 — 플랫폼(window·router·RN) 무의존.
 *
 * `entities`에 두는 이유: 소비처가 `features/auth`(회원가입 동의 게이트)와
 * `features/profile`(설정·동의 관리)로 서로 다른 feature다. 한쪽에 두면 다른 쪽이 그것을
 * import하는 교차 feature 의존이 생긴다.
 *
 * **문구는 전부 미확정이다** — 작성은 기획·법무 몫이고(티켓 [제외 범위]) 조회 API도 없다
 * (생성 SDK에 `term`·`policy` 경로 0건). 그래서 `body`가 `string | null`이고 현재 전 문서가
 * `null`이다. 빈 문자열이나 "준비 중입니다" 같은 **가짜 본문을 넣지 않는다** — 그러면
 * "문구가 있다"와 "없다"가 타입으로 구분되지 않는다. 서버 API가 생기면 이 카탈로그의
 * `body`를 조회 결과로 갈아끼우는 것이 유일한 변경점이다(화면은 resolve 결과만 읽는다).
 */

/** 라우트 파라미터로도 쓰이는 문서 키 — `/terms/service` 형태 */
export type TermsDocKey =
  | "service"
  | "privacy-collection"
  | "location"
  | "marketing"
  | "privacy-policy";

export interface TermsDocument {
  key: TermsDocKey;
  /** 문서명 — 뷰어 헤더 제목이자 진입점("보기")의 접근성 이름 */
  title: string;
  /** 전문. `null`이면 문구 미확정(기획·법무 대기)이고 화면이 자리표시를 그린다 */
  body: string | null;
}

/**
 * 문서 5종. 회원가입 "보기" 4종(service·privacy-collection·location·marketing) +
 * 프로필 설정 2종(service·privacy-policy)이 이 카탈로그를 공유한다.
 * `privacy-collection`(수집·이용 동의)과 `privacy-policy`(처리방침)는 법적으로 다른 문서라
 * 키를 합치지 않는다 (승인 Q2).
 */
export const TERMS_DOCUMENTS: readonly TermsDocument[] = [
  { key: "service", title: "서비스 이용약관", body: null },
  { key: "privacy-collection", title: "개인정보 수집 및 이용", body: null },
  { key: "location", title: "위치기반서비스 이용약관", body: null },
  { key: "marketing", title: "마케팅 정보 수신", body: null },
  { key: "privacy-policy", title: "개인정보 처리방침", body: null },
] as const;

/**
 * 문서 키로 카탈로그를 조회한다 (기준 1). 라우트 파라미터·딥링크로 임의 문자열이 들어올 수
 * 있으므로 입력은 `string`이고, 모르는 키는 `null`이다 — 화면은 그때 "문서를 찾을 수
 * 없어요"를 그린다 (기준 7).
 */
export const resolveTermsDocument = (key: string): TermsDocument | null =>
  TERMS_DOCUMENTS.find((doc) => doc.key === key) ?? null;

/** 문구 미확정 판정 (기준 2·4) — 본문 유무 하나로만 갈린다 */
export const isTermsPlaceholder = (doc: TermsDocument): boolean =>
  doc.body === null;

/** 자리표시 안내 (기준 4) — 구 `features/auth/ui/consent-terms-view.tsx` 문구 승계 */
export const TERMS_PLACEHOLDER_TITLE = "약관 전문은 준비 중이에요";
export const TERMS_PLACEHOLDER_DESCRIPTION =
  "문서가 준비되면 이 화면에서 바로 확인할 수 있어요";

/** 모르는 문서 키로 진입했을 때 (기준 7) */
export const TERMS_NOT_FOUND_HEADER = "약관";
export const TERMS_NOT_FOUND_TITLE = "문서를 찾을 수 없어요";
export const TERMS_NOT_FOUND_DESCRIPTION =
  "주소를 다시 확인하거나 이전 화면으로 돌아가 주세요";
