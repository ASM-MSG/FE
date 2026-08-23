import type { TermsDocKey } from "../../../entities/terms/model/terms-documents";
import type { ConsentStatusResponseDto } from "../../../shared/api/sdk";

/**
 * 위치정보 동의 관리 화면의 표시 파생 (MSG-448 기준 9·12·15·16).
 * 순수 모델 — 플랫폼 API·react·라우터 무의존 (생성 타입만 참조하므로 런타임 의존 없음).
 *
 * 화면은 이 파생만 읽는 얇은 층이다 — apps/mobile에는 RN 렌더 테스트 인프라가 없어
 * (MSG-292 확정 4) 화면에 남은 판정은 검증할 수단이 없다.
 */

/** `GET /api/users/me/consents` 응답 — 조회 전·실패 시에는 필드가 없을 수 있다 */
export type ConsentStatusInput = Partial<ConsentStatusResponseDto> | undefined;

export type ConsentRowId =
  | "ageOver14"
  | "serviceTerms"
  | "privacyPolicy"
  | "locationTerms"
  | "marketing";

export interface ConsentRow {
  id: ConsentRowId;
  /** 행 라벨 — 동의 문장이 아니라 문서·항목명이다(행이 좁다) */
  label: string;
  /**
   * 필수 항목 — 읽기 전용 상태 행으로 그린다. 철회 조작을 두지 않는 근거는
   * `canRevokeLocationConsent` 참조. 선택(마케팅)만 토글 행이다 (기준 9).
   */
  required: boolean;
  agreed: boolean;
  /** 전문 "보기" 대상 — 문서가 없는 만 14세 행만 null (기준 17) */
  docKey: TermsDocKey | null;
}

/** 표시 순서 = 회원가입 동의 화면(CONSENT_ITEMS)과 같은 순서 — 두 화면이 어긋나지 않게 */
const CONSENT_ROW_CATALOG = [
  { id: "ageOver14", label: "만 14세 이상 확인", required: true, docKey: null },
  {
    id: "serviceTerms",
    label: "서비스 이용약관",
    required: true,
    docKey: "service",
  },
  {
    id: "privacyPolicy",
    label: "개인정보 수집 및 이용",
    required: true,
    docKey: "privacy-collection",
  },
  {
    id: "locationTerms",
    label: "위치기반서비스 이용약관",
    required: true,
    docKey: "location",
  },
  {
    id: "marketing",
    label: "마케팅 정보 수신",
    required: false,
    docKey: "marketing",
  },
] as const satisfies readonly Omit<ConsentRow, "agreed">[];

/**
 * 동의 상태 응답 → 표시 행 5개 (기준 9). 필드가 비어 있으면 미동의로 그린다 —
 * 조회 전·실패에도 행 골격이 유지돼 화면이 빈칸이 되지 않는다.
 */
export const consentRows = (status: ConsentStatusInput): ConsentRow[] =>
  CONSENT_ROW_CATALOG.map((row) => ({
    ...row,
    agreed: status?.[row.id] === true,
  }));

/**
 * 필수 4항목 완료 여부 (기준 9의 6번째 필드). **서버가 계산한 값을 그대로 읽는다** —
 * 필수 항목 목록이 늘어도 클라이언트가 조립을 고치지 않도록 하는 것이 명세의 의도다.
 */
export const requiredConsentCompleted = (status: ConsentStatusInput): boolean =>
  status?.requiredCompleted === true;

/**
 * 위치기반(필수) 동의를 화면에서 철회할 수 있는가 — **서버 계약이 판정의 단일 출처다**
 * (기준 16). 생성 SDK 주석이 정본: *"이 동의는 철회할 수 없어 false 는 1400 으로
 * 거절된다"*. 따라서 항상 false이고, 화면은 철회 버튼·다이얼로그를 아예 만들지 않는다
 * (승인 Q1-A) — 절대 성공하지 않는 버튼을 사용자에게 보여주지 않기 위해서다.
 *
 * 서버가 철회를 허용하게 되더라도 이 값만 바꿔서는 안 된다: `app/_layout.tsx`의 게이트가
 * `locationConsent === false`에서 앱 전체를 회원가입 동의 화면으로 잠근다(설정 화면 자신도
 * 사라진다). 철회 UX는 그 구조 결정을 포함한 별도 티켓이다.
 */
export const canRevokeLocationConsent = (): boolean => false;

/** 필수 동의 철회 불가 고지 (기준 15·16) — 화면이 문구를 하드코딩하지 않는다 */
const LOCATION_CONSENT_LOCKED_NOTICE =
  "필수 동의는 철회할 수 없어요. 서비스 이용을 중단하려면 계정 삭제를 이용해 주세요.";

/**
 * 필수 동의 행에 상시 노출되는 고지 (기준 15·16). 철회 판정에서 파생하므로, 계약이 바뀌어
 * `canRevokeLocationConsent`가 참이 되면 이 함수부터 고쳐야 화면이 따라온다.
 */
export const locationConsentNotice = (): string =>
  LOCATION_CONSENT_LOCKED_NOTICE;

/** 마케팅 저장 실패 안내 (기준 12) — 다음 시도가 시작되면 사라진다 */
export const MARKETING_SAVE_ERROR_TEXT =
  "마케팅 수신 동의를 저장하지 못했어요. 잠시 후 다시 시도해주세요";

/** 마케팅 토글 행의 실패 캡션 (기준 12) */
export const resolveMarketingErrorText = (
  failed: boolean,
): string | undefined => (failed ? MARKETING_SAVE_ERROR_TEXT : undefined);
