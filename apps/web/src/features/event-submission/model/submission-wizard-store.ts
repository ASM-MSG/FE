import { create } from "zustand";
import type {
  SubmissionCommonFields,
  SubmissionDraftState,
  SubmissionType,
} from "./submission-form";
import type { SubmissionStep } from "./submission-wizard";

/**
 * 행사 등록 위저드 스토어 (MSG-546 AC 12·13·14) — 비영속 인메모리.
 * 스텝·유형·입력·이미지 상태의 소유자이고, 판정(필수값·날짜·전이 가능)은 순수 모델
 * (submission-form·submission-wizard)이 한다. 플랫폼 API(window/localStorage/router)를
 * 참조하지 않는다 — RN 경계.
 *
 * **비영속 결정 (추정 4)**: 위저드 마운트 시 페이지가 `reset()`을 호출한다. persist는
 * `/org/submissions/:submissionId/edit`(MSG-550 수정 모드)와 섞이면 이전 작성분이
 * 남의 신청서로 새는 위험이 커서 배제했다.
 *
 * **후속 티켓 확장점 (이 파일에 슬롯을 늘린다)**:
 * - MSG-547: `locations`(영역 사각형 목록) 슬롯 + "위치 지정 후 유형 변경 시 입력·지도
 *   선택 초기화" 규칙 — 현재는 유형 변경이 공통 필드를 보존만 한다(AC 13). 초기화 규칙은
 *   위치 상태가 생기는 그 티켓에서 `selectType`에 얹는다.
 * - MSG-548: 확인·제출 — `toCreateDraft`(submission-form) + submitMutation.
 * - MSG-550: `mode: "create" | "edit"` + 서버 신청 상세로 초기값을 채우는 hydrate 액션.
 */

/** 확정된 소속 이벤트 — id는 제출 본문(parentOccurrenceId), 이름은 CTA·표시용 */
export interface SubmissionParentOccurrence {
  occurrenceId: number;
  name: string;
}

export type SubmissionImageStatus =
  | "idle"
  | "uploading"
  | "uploaded"
  | "failed";

export interface SubmissionImageState {
  status: SubmissionImageStatus;
  /** 업로드 성공에서만 채워진다 — 실패는 항상 null (AC 8) */
  s3Key: string | null;
  /** 로컬 미리보기 URL — 생성·해제는 뷰 레이어 몫(플랫폼 API 격리) */
  previewUrl: string | null;
  errorMessage: string | null;
}

const EMPTY_COMMON: SubmissionCommonFields = {
  title: "",
  organizerName: "",
  startsOn: "",
  endsOn: "",
  description: "",
};

const EMPTY_TYPE_FIELDS: Record<SubmissionType, string> = {
  FESTIVAL: "",
  POPUP: "",
  EVENT: "",
};

const IDLE_IMAGE: SubmissionImageState = {
  status: "idle",
  s3Key: null,
  previewUrl: null,
  errorMessage: null,
};

export interface SubmissionWizardState {
  step: SubmissionStep;
  type: SubmissionType | null;
  parentOccurrence: SubmissionParentOccurrence | null;
  common: SubmissionCommonFields;
  /** 유형 전용 필드를 유형별로 각자 보관한다 — 전환-복귀 시 복원 (AC 13) */
  typeFieldValues: Record<SubmissionType, string>;
  image: SubmissionImageState;
  goToStep: (step: SubmissionStep) => void;
  /** 유형 확정 — 공통 입력·유형별 보관값은 건드리지 않는다 (AC 13) */
  selectType: (type: SubmissionType) => void;
  /** 소속 이벤트 확정 = EVENT 확정 + 기본 정보 스텝 진입 (AC 5, 추정 3) */
  confirmEventParent: (parent: SubmissionParentOccurrence) => void;
  setCommonField: (key: keyof SubmissionCommonFields, value: string) => void;
  /** 현재 선택 유형의 전용 필드에 쓴다 — 유형 미선택이면 무시 */
  setTypeFieldValue: (value: string) => void;
  startImageUpload: (previewUrl: string) => void;
  completeImageUpload: (s3Key: string) => void;
  failImageUpload: (message: string) => void;
  reset: () => void;
}

export const useSubmissionWizardStore = create<SubmissionWizardState>(
  (set, get) => ({
    step: "type",
    type: null,
    parentOccurrence: null,
    common: EMPTY_COMMON,
    typeFieldValues: EMPTY_TYPE_FIELDS,
    image: IDLE_IMAGE,
    goToStep: (step) => set({ step }),
    selectType: (type) => set({ type }),
    confirmEventParent: (parent) =>
      set({ type: "EVENT", parentOccurrence: parent, step: "basic" }),
    setCommonField: (key, value) =>
      set((state) => ({ common: { ...state.common, [key]: value } })),
    setTypeFieldValue: (value) => {
      const { type } = get();
      if (type === null) return;
      set((state) => ({
        typeFieldValues: { ...state.typeFieldValues, [type]: value },
      }));
    },
    startImageUpload: (previewUrl) =>
      set({
        image: {
          status: "uploading",
          s3Key: null,
          previewUrl,
          errorMessage: null,
        },
      }),
    completeImageUpload: (s3Key) =>
      set((state) => ({
        image: {
          ...state.image,
          status: "uploaded",
          s3Key,
          errorMessage: null,
        },
      })),
    // 실패는 s3Key·미리보기를 남기지 않는다 — 반쯤 올라간 이미지로 제출되는 경로 차단 (AC 8)
    failImageUpload: (message) =>
      set({
        image: {
          status: "failed",
          s3Key: null,
          previewUrl: null,
          errorMessage: message,
        },
      }),
    reset: () =>
      set({
        step: "type",
        type: null,
        parentOccurrence: null,
        common: EMPTY_COMMON,
        typeFieldValues: EMPTY_TYPE_FIELDS,
        image: IDLE_IMAGE,
      }),
  }),
);

/** 순수 판정 함수(submission-form)에 넣을 납작한 형태로 파생한다 (AC 10) */
export const toDraftState = (
  state: SubmissionWizardState,
): SubmissionDraftState => ({
  type: state.type,
  parentOccurrenceId: state.parentOccurrence?.occurrenceId ?? null,
  common: state.common,
  typeFieldValues: state.typeFieldValues,
  imageS3Key: state.image.s3Key,
});

/**
 * 작성 중(dirty) 판정 — 이탈 경고의 근거 (AC 14).
 * 유형만 골라 스텝 1에 머무른 상태는 잃을 입력이 없어 작성 중으로 보지 않는다.
 */
export const isSubmissionDirty = (state: SubmissionWizardState): boolean =>
  state.step !== "type" ||
  state.image.s3Key !== null ||
  Object.values(state.common).some((value) => value !== "") ||
  Object.values(state.typeFieldValues).some((value) => value !== "");
