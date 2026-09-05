import type { AreaRect } from "@/features/event-submission/model/submission-area";
import type { SubmissionDraftState } from "@/features/event-submission/model/submission-form";

/**
 * 행사 등록 위저드 draft 픽스처 (테스트 전용) — 지역축제 완전 입력 한 벌.
 * 필수값 판정(`isBasicStepComplete`)·제출 본문 조립(`toCreateRequest`)·검토 요약 파생
 * (`submission-review`)이 같은 20줄 리터럴을 복제하게 되어 추출했다 (MSG-548 —
 * org-submission-fixture 선례, 중복 게이트 검출).
 *
 * 각 테스트는 스프레드로 필요한 필드만 덮는다(`{ ...FESTIVAL_DRAFT, type: "POPUP" }`).
 */
export const FESTIVAL_DRAFT: SubmissionDraftState = {
  type: "FESTIVAL",
  parentOccurrenceId: null,
  common: {
    title: "광안리 M 드론쇼",
    organizerName: "부산광역시 관광마이스과",
    startsOn: "2026-09-05",
    endsOn: "2026-09-07",
    description: "광안리 해변의 밤하늘을 수놓는 정기 드론 공연입니다.",
  },
  typeFieldValues: {
    FESTIVAL: "드론 공연 · 체험 부스",
    POPUP: "11:00 ~ 20:00",
    EVENT: "현장 참여 후 영상 업로드",
  },
  imageS3Key: "pending/submissions/abc.jpg",
  imageKept: false,
  areaRects: [],
};

/** 격자 사각형 한 개 — 인자 순서는 min→max (x, y 쌍) */
export const areaRect = (
  minGridX: number,
  minGridY: number,
  maxGridX: number,
  maxGridY: number,
): AreaRect => ({ minGridX, minGridY, maxGridX, maxGridY });
