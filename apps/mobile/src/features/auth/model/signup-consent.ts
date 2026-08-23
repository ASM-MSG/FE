/**
 * 회원가입 약관 동의 항목 카탈로그 + 체크 상태 파생 (AC 8·9·13~17).
 * SOURCE: Figma 회원가입 — 약관 동의 14870:430(미동의)·14870:467(전체 동의).
 *
 * 화면은 이 모듈의 순수 함수만 호출하는 얇은 층으로 둔다 — apps/mobile에는 RN 렌더
 * 테스트 인프라가 없어(MSG-292 확정 4) 훅·컴포넌트에 남은 로직은 검증할 수단이 없다.
 *
 * 이 화면이 발사하는 요청은 위치기반 동의 1건뿐이다(AC 21) — 나머지 4개는 클라이언트
 * 게이트 조건으로만 강제한다.
 *
 * [MSG-448] 위 문단의 원문("저장 엔드포인트가 없다")은 더 이상 사실이 아니다 — MSG-451
 * SDK 재생성으로 `submitConsents`(5항목 일괄)·`updateMarketingConsent`가 생겼다. 가입 시
 * 마케팅 동의를 저장하도록 배선하는 것은 MSG-448 범위 밖(승인 Q7)이라 동작은 그대로 두고
 * **사실만 정정**한다 — 정정하지 않으면 다음 티켓이 같은 오판을 승계한다.
 */

import type { TermsDocKey } from "../../../entities/terms/model/terms-documents";

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
   * 약관 전문 뷰가 열 문서의 키. null이면 우측 "보기"가 없는 행이다 —
   * 만 14세 확인은 문서가 없으므로 이 행에만 null이다 (AC 8·25).
   *
   * [MSG-448] `termsTitle: string`에서 교체됐다. 헤더 제목을 여기 두지 않고 카탈로그
   * (`entities/terms`)에서 파생하는 이유는, 같은 문서를 프로필 설정·동의 관리 화면도
   * 열게 되면서 제목이 세 곳에 흩어질 수 있기 때문이다. MSG-422의 결정("보기 유무와
   * 헤더 제목을 한 필드로")은 유지하고 출처만 약관 카탈로그로 옮겼다.
   */
  termsDocKey: TermsDocKey | null;
}

/** 표시 순서 = Figma consent-list 5행 순서 */
export const CONSENT_ITEMS: readonly ConsentItem[] = [
  {
    id: "age14",
    label: "만 14세 이상입니다. (필수)",
    required: true,
    termsDocKey: null,
  },
  {
    id: "termsOfService",
    label: "서비스 이용약관에 동의 (필수)",
    required: true,
    termsDocKey: "service",
  },
  {
    id: "privacy",
    label: "개인정보 수집 및 이용에 동의 (필수)",
    required: true,
    termsDocKey: "privacy-collection",
  },
  {
    id: "location",
    label: "위치기반서비스 이용약관에 동의 (필수)",
    required: true,
    termsDocKey: "location",
  },
  {
    id: "marketing",
    label: "마케팅 정보 수신에 동의 (선택)",
    required: false,
    termsDocKey: "marketing",
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
