/**
 * 회원가입 약관 동의 항목 카탈로그 + 체크 상태 파생 (AC 8·9·13~17).
 * SOURCE: Figma 회원가입 — 약관 동의 14870:430(미동의)·14870:467(전체 동의).
 *
 * 화면은 이 모듈의 순수 함수만 호출하는 얇은 층으로 둔다 — apps/mobile에는 RN 렌더
 * 테스트 인프라가 없어(MSG-292 확정 4) 훅·컴포넌트에 남은 로직은 검증할 수단이 없다.
 *
 * 서버에 저장되는 동의는 위치기반 1건뿐이다(승인 Q1) — 나머지 4개는 저장 엔드포인트가
 * 없어 클라이언트 게이트 조건으로만 강제하고 어떤 요청도 발사하지 않는다 (AC 21).
 */

export type ConsentItemId =
  | "age14"
  | "termsOfService"
  | "privacy"
  | "location"
  | "marketing";

export interface ConsentItem {
  id: ConsentItemId;
  /** Figma 정본 문구 — (필수)/(선택) 표기까지 포함한다 (AC 8) */
  label: string;
  /** 필수 항목 — 전부 체크돼야 CTA가 활성화된다 (AC 16) */
  required: boolean;
  /**
   * 약관 전문 뷰의 헤더 제목. null이면 우측 "보기"가 없는 행이다 —
   * 만 14세 확인은 문서가 없으므로 이 행에만 null이다 (AC 8·25).
   * 동의 라벨 문장 대신 문서명을 두는 이유는 헤더가 한 줄이기 때문이다(라벨은 잘린다).
   */
  termsTitle: string | null;
}

/** 표시 순서 = Figma consent-list 5행 순서 */
export const CONSENT_ITEMS: readonly ConsentItem[] = [
  {
    id: "age14",
    label: "만 14세 이상입니다. (필수)",
    required: true,
    termsTitle: null,
  },
  {
    id: "termsOfService",
    label: "서비스 이용약관에 동의 (필수)",
    required: true,
    termsTitle: "서비스 이용약관",
  },
  {
    id: "privacy",
    label: "개인정보 수집 및 이용에 동의 (필수)",
    required: true,
    termsTitle: "개인정보 수집 및 이용",
  },
  {
    id: "location",
    label: "위치기반서비스 이용약관에 동의 (필수)",
    required: true,
    termsTitle: "위치기반서비스 이용약관",
  },
  {
    id: "marketing",
    label: "마케팅 정보 수신에 동의 (선택)",
    required: false,
    termsTitle: "마케팅 정보 수신",
  },
] as const;

export type ConsentState = Record<ConsentItemId, boolean>;

const buildState = (checked: boolean): ConsentState =>
  Object.fromEntries(
    CONSENT_ITEMS.map((item) => [item.id, checked]),
  ) as ConsentState;

/**
 * 초기 진입 상태 — 5개 전부 미체크 = Figma 미동의 프레임 (AC 9).
 * 웹 LocationConsentScreen은 필수를 초기 체크로 시작하지만 모바일은 Figma 정본을 따른다.
 */
export const INITIAL_CONSENT_STATE: ConsentState = buildState(false);

/** "모두 동의" 탭 — 5개를 한 번에 같은 값으로 맞춘다 (AC 13) */
export const toggleAll = (next: boolean): ConsentState => buildState(next);

/** 개별 항목 탭 — 해당 항목만 뒤집는다 (AC 14) */
export const toggleItem = (
  state: ConsentState,
  id: ConsentItemId,
): ConsentState => ({ ...state, [id]: !state[id] });

/**
 * "모두 동의" 체크 표시 여부 — 5개가 전부 체크된 상태에서만 참이다.
 * 개별 해제 시 자동 해제(AC 14)·개별 5개 완성 시 자동 체크(AC 15)가 이 파생 하나로 성립한다.
 */
export const isAllAgreed = (state: ConsentState): boolean =>
  CONSENT_ITEMS.every((item) => state[item.id]);

/** CTA 활성 조건 — 필수 4개 AND. 마케팅(선택)은 무관하다 (AC 16·17) */
export const canSubmitConsent = (state: ConsentState): boolean =>
  CONSENT_ITEMS.filter((item) => item.required).every((item) => state[item.id]);
