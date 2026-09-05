import type {
  EventSubmissionDetailResponseDto,
  EventSubmissionLocationResponseDto,
  EventSubmissionUpdateRequestDto,
} from "@/shared/api/generated/types.gen";
import type { AreaRect } from "./submission-area";
import {
  isBasicStepComplete,
  isSubmissionType,
  SUBMISSION_FORM_CONFIGS,
  type SubmissionCommonFields,
  type SubmissionDraftState,
  type SubmissionType,
} from "./submission-form";

/**
 * 반려 재신청(수정 모드) 순수 로직 — 신청 상세 → 위저드 프리필 매핑, 재제출 본문 조립,
 * 이탈 경고 기준선 비교 (MSG-550 AC 1·2·5·8·9).
 * 플랫폼 API(window·document·router)·지도 SDK를 참조하지 않는다 — RN 재사용 대상.
 *
 * **`submission-form`과 나눠 둔 이유**: 그 파일은 유형별 폼 설정 3벌과 **생성(POST) 계약**의
 * 정본이고, 여기는 상세 응답 해석·수정 진입 가드·**갱신(PATCH) 계약**이라 계약이 다르다
 * (`EventSubmissionUpdateRequestDto`는 `type`·`parentOccurrenceId`가 없는 별개 타입이라
 * `toCreateDraft` 재사용이 불가하다 — 실측). 유형 3벌 설정과 필수값 판정은 그대로 위임한다.
 */

/** 수정 진입을 막는 사유 — 둘 다 신청 상세로 회송한다 (AC 8) */
export type SubmissionEditBlock = "not-rejected" | "unknown-type";

/** 반려 항목·사유 — 배너 재료 (AC 3) */
export interface SubmissionRejectionNotice {
  reasonCodes: string[];
  reasonText: string;
}

/** 위저드 스토어에 한 번에 얹을 프리필 값 한 벌 (AC 1) */
export interface SubmissionHydratePatch {
  submissionId: number;
  type: SubmissionType;
  /** EVENT만 값이 있고 표시 전용이다 — PATCH에 필드가 없다 (추정 8) */
  parentOccurrence: { occurrenceId: number; name: string } | null;
  common: SubmissionCommonFields;
  /** 원 유형의 전용 필드 값 하나 */
  typeFieldValue: string;
  /** 서버 대표 이미지 열람 URL(presigned https) — 미리보기이자 "유지" 표식이다 (AC 4) */
  keptImageUrl: string;
  areaRects: AreaRect[];
  /**
   * 반려 항목·사유. 계약상 REJECTED면 채워지지만 응답 타입이 nullable이라 배너 재료만
   * 비어 있을 수 있다 — 프리필·재제출은 사유 유무와 무관하게 성립한다.
   */
  rejection: SubmissionRejectionNotice | null;
  /** 서버 위치가 2곳 이상이라 첫 위치만 프리필됐다 (승인 확정 — 소실 안내 근거) */
  droppedLocations: boolean;
}

export type SubmissionEditHydration =
  | { ok: SubmissionHydratePatch }
  | { blocked: SubmissionEditBlock };

/** 서버 상태 문자열의 반려 값 — 상세 DTO의 status는 plain string이다(실측) */
const REJECTED = "REJECTED";

/**
 * 프리필 대상 위치 — order가 가장 작은 한 곳 (승인 확정).
 *
 * 위저드의 영역 슬롯은 위치 1개분이고(MSG-547 계약) PATCH는 locations를 통째로 갈아끼운다.
 * 전 위치를 한 위치로 평탄화하면 합집합이 위치당 81칸 상한을 넘어 서버가 거절할 수 있어
 * 첫 위치만 살리고 소실을 화면에 고지한다. 응답은 순번 오름차순이지만 순서에 기대지 않는다.
 */
const firstLocation = (
  locations: readonly EventSubmissionLocationResponseDto[],
): EventSubmissionLocationResponseDto | null =>
  locations.reduce<EventSubmissionLocationResponseDto | null>(
    (first, location) =>
      first === null || location.order < first.order ? location : first,
    null,
  );

/**
 * 신청 상세 → 위저드 프리필 판정 (AC 1·8).
 * 반려가 아닌 신청과 폼 설정이 없는 유형(3종 밖)은 수정 대상이 아니다 — 화면이 상세로
 * 회송한다. 유형 전용 필드는 원 유형의 것 하나만 꺼낸다(다른 유형 값은 null이다).
 */
export const hydrationFromDetail = (
  detail: EventSubmissionDetailResponseDto,
): SubmissionEditHydration => {
  if (detail.status !== REJECTED) return { blocked: "not-rejected" };
  if (!isSubmissionType(detail.type)) return { blocked: "unknown-type" };

  const type = detail.type;
  const { title, organizerName, startsOn, endsOn, description } = detail;

  return {
    ok: {
      submissionId: detail.id,
      type,
      parentOccurrence: detail.parentEvent,
      common: { title, organizerName, startsOn, endsOn, description },
      typeFieldValue: detail[SUBMISSION_FORM_CONFIGS[type].typeFieldKey] ?? "",
      keptImageUrl: detail.imageUrl,
      areaRects: firstLocation(detail.locations)?.areaRects ?? [],
      rejection: detail.rejection,
      droppedLocations: detail.locations.length > 1,
    },
  };
};

/**
 * 재제출 발사의 단일 관문 (AC 5) — 필수값(기본 정보 + 확정 영역 1개 이상)이 갖춰졌을 때만
 * 완전한 PATCH 본문을 돌려주고, 아니면 null이다 (`toCreateRequest`와 같은 대칭 구조).
 *
 * 생성 본문과 다른 점은 전부 서버 계약 실측이다: **`type`·`parentOccurrenceId`가 없고**
 * (유형·부모 이벤트는 재제출로 바꿀 수 없다), `imageS3Key`는 **새 업로드가 있을 때만**
 * 싣는다(생략 = 기존 이미지 유지), `locations`는 통째로 교체된다.
 * 유형 전용 필드는 원 유형의 것 하나만 싣는다 — 유형 밖 항목이 실리면 서버 13439다.
 */
export const toUpdateRequest = (
  state: SubmissionDraftState,
): EventSubmissionUpdateRequestDto | null => {
  const { type, common, typeFieldValues, imageS3Key, areaRects } = state;
  if (type === null) return null;
  if (!isBasicStepComplete(state) || areaRects.length === 0) return null;

  return {
    title: common.title,
    organizerName: common.organizerName,
    startsOn: common.startsOn,
    endsOn: common.endsOn,
    description: common.description,
    [SUBMISSION_FORM_CONFIGS[type].typeFieldKey]: typeFieldValues[type],
    ...(imageS3Key !== null && { imageS3Key }),
    locations: [{ areaRects }],
  };
};

const isSameRect = (a: AreaRect, b: AreaRect): boolean =>
  a.minGridX === b.minGridX &&
  a.maxGridX === b.maxGridX &&
  a.minGridY === b.minGridY &&
  a.maxGridY === b.maxGridY;

/**
 * hydrate 스냅숏 대비 입력이 바뀌었는가 (AC 9 — 승인 확정안).
 *
 * 수정 모드는 "빈 값 대비" 판정(`isSubmissionDirty`의 신규 등록 규칙)을 쓸 수 없다 —
 * 프리필 직후 무조건 작성 중이 되어 사유만 확인하고 나가는 동선에서 경고가 오발화한다.
 * 스텝 위치는 비교하지 않는다: 스텝 왕복은 잃을 입력을 만들지 않는다.
 *
 * 필드별 비교다(직렬화 비교 금지) — 서버 원본 사각형은 키 순서가 위저드가 만든 것과 달라
 * `JSON.stringify` 비교가 같은 영역을 변경으로 오판한다(DTO 필드 순서 실측).
 */
export const hasDraftChanged = (
  baseline: SubmissionDraftState,
  current: SubmissionDraftState,
): boolean => {
  if (
    baseline.type !== current.type ||
    baseline.parentOccurrenceId !== current.parentOccurrenceId ||
    baseline.imageS3Key !== current.imageS3Key
  ) {
    return true;
  }
  const commonKeys = Object.keys(
    baseline.common,
  ) as (keyof SubmissionCommonFields)[];
  if (commonKeys.some((key) => baseline.common[key] !== current.common[key])) {
    return true;
  }
  const typeKeys = Object.keys(baseline.typeFieldValues) as SubmissionType[];
  if (
    typeKeys.some(
      (key) => baseline.typeFieldValues[key] !== current.typeFieldValues[key],
    )
  ) {
    return true;
  }
  return (
    baseline.areaRects.length !== current.areaRects.length ||
    baseline.areaRects.some(
      (rect, index) => !isSameRect(rect, current.areaRects[index]),
    )
  );
};
