import type { EventSubmissionCreateRequestDto } from "@/shared/api/generated";
import { euroJosa } from "@/shared/format";

/**
 * 행사 등록 유형별 폼 설정·필수값·날짜 검증·제출 본문 조립 — 순수 로직 (MSG-546 AC 6·10·11).
 * 플랫폼 API(window·document·router)를 참조하지 않는다 — RN 재사용 대상
 * (설정 객체 3벌로 유형을 표현하는 방식은 widgets/console-shell/console-config 선례).
 */

/** 등록 유형 — 서버 계약 그대로 (FESTIVAL 지역축제 · POPUP 팝업스토어 · EVENT 이벤트) */
export type SubmissionType = EventSubmissionCreateRequestDto["type"];

/** 유형 표시명 — 카드 제목·유형 뱃지·CTA 문구 공용 */
export const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  FESTIVAL: "지역축제",
  POPUP: "팝업스토어",
  EVENT: "이벤트",
};

/** 유형 전용 필드 키 — 유형 밖 필드가 실리면 서버 13439 */
export type SubmissionTypeFieldKey =
  | "programDescription"
  | "operatingHours"
  | "participationMethod";

export interface SubmissionTypeCard {
  type: SubmissionType;
  title: string;
  description: string;
  meta: string;
  /** 지역축제만 배지형 메타(Figma 15525:8851), 나머지는 텍스트 */
  metaVariant: "badge" | "text";
}

/**
 * 유형 선택 카드 3종 (AC 1 — Figma 15525:8851).
 * 팝업스토어 메타는 시안의 "운영시간 · 예약 링크"를 쓰지 않는다 — 예약 링크는 신청 본문에
 * 없는 필드라 실제 입력 항목과 어긋난다(승인 확정: 실필드 기준 문구).
 */
export const SUBMISSION_TYPE_CARDS: readonly SubmissionTypeCard[] = [
  {
    type: "FESTIVAL",
    title: "지역축제",
    description: "여러 장소와 프로그램을 운영하는 지역 대표 축제·문화 행사",
    meta: "다중 위치 · 프로그램",
    metaVariant: "badge",
  },
  {
    type: "POPUP",
    title: "팝업스토어",
    description: "운영 기간이 정해진 브랜드 매장과 체험형 팝업 공간",
    meta: "운영 기간 · 운영 시간",
    metaVariant: "text",
  },
  {
    type: "EVENT",
    title: "이벤트",
    description: "참여자와 현장 콘텐츠를 모으는 공개 커뮤니티형 행사",
    meta: "참여 방식 · 대표 위치",
    metaVariant: "text",
  },
];

export interface SubmissionFormConfig {
  /** 본문 제목 — "지역축제 기본 정보" */
  heading: string;
  /** 우상단 유형 뱃지 — "유형 · 지역축제" */
  badge: string;
  titleLabel: string;
  organizerLabel: string;
  periodLabel: string;
  typeFieldKey: SubmissionTypeFieldKey;
  typeFieldLabel: string;
  descriptionLabel: string;
  imageLabel: string;
  /** 다음 스텝 CTA 문구 */
  ctaLabel: string;
  /** 카드 하단 각주 */
  footnote: string;
}

const formConfig = (
  type: SubmissionType,
  config: Omit<SubmissionFormConfig, "heading" | "badge">,
): SubmissionFormConfig => ({
  ...config,
  heading: `${SUBMISSION_TYPE_LABELS[type]} 기본 정보`,
  badge: `유형 · ${SUBMISSION_TYPE_LABELS[type]}`,
});

/**
 * 유형별 기본 정보 폼 설정 3벌 (AC 6 — Figma 4A 15525:8725 · 4B 15525:10251 ·
 * 4C 15525:10316의 라벨·CTA·각주 표가 정본). 폼 컴포넌트는 이 설정을 주입받아 한 벌로
 * 렌더한다 — 컴포넌트 분기가 아니다.
 */
export const SUBMISSION_FORM_CONFIGS: Record<
  SubmissionType,
  SubmissionFormConfig
> = {
  FESTIVAL: formConfig("FESTIVAL", {
    titleLabel: "축제명",
    organizerLabel: "주최 기관",
    periodLabel: "축제 기간",
    typeFieldKey: "programDescription",
    typeFieldLabel: "주요 프로그램",
    descriptionLabel: "축제 소개",
    imageLabel: "대표 이미지",
    ctaLabel: "다음: 축제 위치 등록",
    footnote:
      "행사 등록은 건별 관리자 승인 후 일반 유저 지도와 기존 행사방에 노출됩니다.",
  }),
  POPUP: formConfig("POPUP", {
    titleLabel: "팝업명",
    organizerLabel: "브랜드 / 운영사",
    periodLabel: "운영 기간",
    typeFieldKey: "operatingHours",
    typeFieldLabel: "운영 시간",
    descriptionLabel: "팝업 소개",
    imageLabel: "대표 이미지",
    ctaLabel: "다음: 매장 위치 등록",
    footnote:
      "승인 후 팝업스토어 카테고리와 지도에 노출되며 행사방이 함께 생성됩니다.",
  }),
  EVENT: formConfig("EVENT", {
    titleLabel: "행사방 이름",
    organizerLabel: "운영 주체",
    periodLabel: "공개 기간",
    typeFieldKey: "participationMethod",
    typeFieldLabel: "참여 방식",
    descriptionLabel: "행사방 소개",
    imageLabel: "커버 이미지",
    ctaLabel: "다음: 대표 위치 등록",
    footnote:
      "승인 후 공개 행사방이 생성되고 대표 위치가 일반 유저 지도에 표시됩니다.",
  }),
};

/** "{이름}(으)로 계속" — 유형 카드 CTA와 모달 확정 CTA 공용 (AC 2·5) */
export const continueWithLabel = (name: string): string =>
  `${name}${euroJosa(name)} 계속`;

/** 유형 무관 공통 입력 필드 */
export interface SubmissionCommonFields {
  title: string;
  organizerName: string;
  /** KST 날짜(YYYY-MM-DD) — DTO startsOn 그대로 */
  startsOn: string;
  /** KST 날짜(YYYY-MM-DD) — DTO endsOn 그대로 */
  endsOn: string;
  description: string;
}

/** 판정·조립 입력 — 스토어에서 납작하게 파생한 형태 (플랫폼 중립) */
export interface SubmissionDraftState {
  type: SubmissionType | null;
  parentOccurrenceId: number | null;
  common: SubmissionCommonFields;
  /** 유형 전용 필드 값 — 유형별로 각자 보관한다 (AC 13) */
  typeFieldValues: Record<SubmissionType, string>;
  imageS3Key: string | null;
}

const isFilled = (value: string): boolean => value.trim() !== "";

/**
 * 기본 정보 스텝의 필수값이 모두 찼는가 (AC 10) — 공통 5필드 + 선택 유형의 전용 필드 +
 * 이미지 s3Key, EVENT는 parentOccurrenceId까지. 다른 유형의 전용 필드는 판정에 넣지 않는다
 * (유형별 보관 — AC 13).
 */
export const isBasicStepComplete = (state: SubmissionDraftState): boolean => {
  if (state.type === null) return false;
  if (state.type === "EVENT" && state.parentOccurrenceId === null) return false;
  if (state.imageS3Key === null) return false;
  if (!isFilled(state.typeFieldValues[state.type])) return false;
  const { title, organizerName, startsOn, endsOn, description } = state.common;
  return [title, organizerName, startsOn, endsOn, description].every(isFilled);
};

/** 종료일이 시작일보다 앞선 경우 */
export const PERIOD_ORDER_MESSAGE = "종료일은 시작일과 같거나 이후여야 해요";
/** 종료일이 오늘 이전인 경우 — 서버 13433 선반영 */
export const PERIOD_PAST_MESSAGE =
  "종료일이 오늘 이전인 행사는 등록할 수 없어요";

/**
 * 기간 입력의 문제를 안내 문구로 돌려준다 (AC 11) — 문제가 없으면 null.
 * 아직 비어 있는 날짜는 안내 대상이 아니다(필수값 판정의 몫).
 * KST 날짜 문자열(YYYY-MM-DD)은 사전순 비교가 곧 시간순 비교다.
 */
export const periodIssueMessage = (
  { startsOn, endsOn }: Pick<SubmissionCommonFields, "startsOn" | "endsOn">,
  todayKst: string,
): string | null => {
  if (startsOn === "" || endsOn === "") return null;
  if (endsOn < startsOn) return PERIOD_ORDER_MESSAGE;
  if (endsOn < todayKst) return PERIOD_PAST_MESSAGE;
  return null;
};

/** 제출 본문 부분형 — 위치(MSG-547)와 실제 제출(MSG-548)이 이 위에 얹힌다 */
export type SubmissionCreateDraft = Partial<EventSubmissionCreateRequestDto>;

/**
 * 위저드 입력을 제출 본문(부분형)으로 조립한다 (AC 6·12).
 * **유형 전용 필드는 선택 유형의 것 하나만 싣는다** — 유형 밖 항목이 실리면 서버 13439라
 * 구조로 막는다. parentOccurrenceId도 EVENT에서만 실린다.
 * `locations`는 위치 스텝(MSG-547)이, 실제 제출은 MSG-548이 채운다.
 */
export const toCreateDraft = (
  state: SubmissionDraftState,
): SubmissionCreateDraft | null => {
  const { type, common, typeFieldValues, imageS3Key, parentOccurrenceId } =
    state;
  if (type === null) return null;

  const base: SubmissionCreateDraft = {
    type,
    title: common.title,
    organizerName: common.organizerName,
    startsOn: common.startsOn,
    endsOn: common.endsOn,
    description: common.description,
    ...(imageS3Key !== null && { imageS3Key }),
  };

  const typeFieldKey = SUBMISSION_FORM_CONFIGS[type].typeFieldKey;
  return {
    ...base,
    [typeFieldKey]: typeFieldValues[type],
    ...(type === "EVENT" &&
      parentOccurrenceId !== null && { parentOccurrenceId }),
  };
};
