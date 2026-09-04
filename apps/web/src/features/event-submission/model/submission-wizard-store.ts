import { create } from "zustand";
import type { AreaRect } from "./submission-area";
import {
  hasDraftChanged,
  type SubmissionHydratePatch,
  type SubmissionRejectionNotice,
} from "./submission-edit";
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
 * - MSG-547(완료): `areaRects` 슬롯 + "위치 지정 후 유형 변경 시 입력·지도 선택 초기화"
 *   규칙(`selectType`). 다중 위치 UX는 티켓 제외 범위라 슬롯은 **위치 1개분**이다 —
 *   MSG-548이 제출 본문을 `locations: [{ areaRects }]`(1~20개 계약의 1개)로 조립한다.
 * - MSG-548(완료): 확인·제출 — `toDraftState`가 `areaRects`까지 노출하고,
 *   `toCreateRequest`(submission-form)가 `locations: [{ areaRects }]`로 조립해 제출한다.
 *   스토어 본문은 늘지 않았다 — 제출은 뷰(ReviewStep) + `api/use-submit-submission` 몫이다.
 * - MSG-550(완료): 수정 모드 — `editContext`(신청 id·반려 사유·위치 소실 표식)와 `hydrate`
 *   액션이 슬롯을 이행했다. `mode`는 별도 상태가 아니라 `submissionWizardMode`로 파생한다
 *   (editContext가 곧 수정 모드의 근거라 두 값이 어긋날 자리를 만들지 않는다).
 *   이탈 경고는 hydrate 시점 스냅숏(`baseline`) 대비 변경으로 판정한다.
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
  /**
   * 서버에 이미 있는 대표 이미지의 열람 URL (MSG-550 AC 4) — 수정 모드 hydrate가 심는다.
   * "기존 이미지 유지"의 근거이자 **새 업로드 실패 시 복원 지점**이다(추정 5).
   * 신규 등록에서는 항상 null이라 546의 실패 동작(전부 비움)이 그대로 남는다.
   */
  keptPreviewUrl: string | null;
}

/** 수정 모드의 대상 신청 — 이 값의 유무가 곧 mode다 (MSG-550) */
export interface SubmissionEditContext {
  submissionId: number;
  /** 반려 항목·사유 — 배너 재료 (AC 3) */
  rejection: SubmissionRejectionNotice | null;
  /** 서버 위치가 2곳 이상이라 첫 위치만 프리필됐다 (AC 1 — 소실 안내) */
  droppedLocations: boolean;
}

export type SubmissionWizardMode = "create" | "edit";

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
  keptPreviewUrl: null,
};

/**
 * 유형 확정 시의 상태 패치 (AC 12 — MSG-546 확장점 이행).
 *
 * 지도 선택까지 마친 뒤 유형을 갈아타면 유형별 필수값·영역이 새 유형과 맞지 않는다 —
 * 스텝 1이 예고한 대로 입력·이미지·영역을 비운다. 같은 유형 재선택은 무해하므로 보존하고,
 * 확정 영역이 없으면 종전 보존 동작(MSG-546 AC 13) 그대로다.
 *
 * 유형 확정 경로가 둘이라 판정을 여기 모았다 — 카드 클릭(`selectType`)과 EVENT 모달
 * 확정(`confirmEventParent`). 후자를 빼먹으면 EVENT로 갈아탈 때 규칙이 새어나간다.
 */
const typeChangePatch = (
  state: Pick<SubmissionWizardState, "type" | "areaRects">,
  type: SubmissionType,
): Partial<SubmissionWizardState> =>
  state.areaRects.length > 0 && state.type !== type
    ? {
        type,
        common: EMPTY_COMMON,
        typeFieldValues: EMPTY_TYPE_FIELDS,
        image: IDLE_IMAGE,
        areaRects: [],
      }
    : { type };

export interface SubmissionWizardState {
  step: SubmissionStep;
  type: SubmissionType | null;
  parentOccurrence: SubmissionParentOccurrence | null;
  common: SubmissionCommonFields;
  /** 유형 전용 필드를 유형별로 각자 보관한다 — 전환-복귀 시 복원 (AC 13) */
  typeFieldValues: Record<SubmissionType, string>;
  image: SubmissionImageState;
  /** 위치 1의 확정 영역 사각형 (MSG-547 AC 5·6·11) — 겹침 허용, 합집합 81칸 상한 */
  areaRects: AreaRect[];
  /** 수정 모드의 대상 신청 — null이면 신규 등록이다 (MSG-550) */
  editContext: SubmissionEditContext | null;
  /** hydrate 시점의 입력 스냅숏 — 수정 모드 이탈 경고의 기준선 (MSG-550 AC 9) */
  baseline: SubmissionDraftState | null;
  goToStep: (step: SubmissionStep) => void;
  /**
   * 유형 확정 — 공통 입력·유형별 보관값은 건드리지 않는다 (AC 13).
   * 단 **확정 영역이 있는 상태에서 다른 유형으로 바꾸면** 입력·이미지·영역을 전부
   * 초기화한다 (MSG-547 AC 12 — 스텝 1 안내문의 약속 이행).
   */
  selectType: (type: SubmissionType) => void;
  /** 소속 이벤트 확정 = EVENT 확정 + 기본 정보 스텝 진입 (AC 5, 추정 3) */
  confirmEventParent: (parent: SubmissionParentOccurrence) => void;
  /**
   * 반려된 신청의 제출값으로 위저드를 채운다 (MSG-550 AC 1) — 유형·입력·이미지·영역·
   * 반려 사유·시작 스텝을 **한 번의 set으로** 얹는다. 조각내면 중간 상태(유형만 확정된
   * 위저드)가 렌더돼 진행 표시·필수값 판정이 잠깐 어긋난다.
   */
  hydrate: (patch: SubmissionHydratePatch) => void;
  setCommonField: (key: keyof SubmissionCommonFields, value: string) => void;
  /** 현재 선택 유형의 전용 필드에 쓴다 — 유형 미선택이면 무시 */
  setTypeFieldValue: (value: string) => void;
  startImageUpload: (previewUrl: string) => void;
  completeImageUpload: (s3Key: string) => void;
  failImageUpload: (message: string) => void;
  /** 후보 사각형 확정 — 상한·경고 판정은 순수 모델(submission-area)이 이미 했다 (AC 5) */
  addAreaRect: (rect: AreaRect) => void;
  removeAreaRect: (index: number) => void;
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
    areaRects: [],
    editContext: null,
    baseline: null,
    goToStep: (step) => set({ step }),
    selectType: (type) => set((state) => typeChangePatch(state, type)),
    // EVENT는 카드 클릭이 selectType을 부르지 않는다 — 모달을 열고 **확정이 곧 유형 확정**
    // 이다(TypeSelectStep). 그래서 초기화 규칙을 selectType에만 두면 EVENT로 갈아탈 때
    // 새 유형과 맞지 않는 입력·영역이 그대로 남는다(codex 리뷰 P1) — 같은 판정을 공유한다
    confirmEventParent: (parent) =>
      set((state) => ({
        ...typeChangePatch(state, "EVENT"),
        parentOccurrence: parent,
        step: "basic",
      })),
    hydrate: (patch) =>
      set(() => {
        const typeFieldValues = {
          ...EMPTY_TYPE_FIELDS,
          [patch.type]: patch.typeFieldValue,
        };
        const image: SubmissionImageState = {
          status: "idle",
          s3Key: null,
          previewUrl: patch.keptImageUrl,
          errorMessage: null,
          keptPreviewUrl: patch.keptImageUrl,
        };
        return {
          step: "basic",
          type: patch.type,
          parentOccurrence: patch.parentOccurrence,
          common: patch.common,
          typeFieldValues,
          image,
          areaRects: patch.areaRects,
          editContext: {
            submissionId: patch.submissionId,
            rejection: patch.rejection,
            droppedLocations: patch.droppedLocations,
          },
          // 기준선은 방금 채운 값 그대로다 — `toDraftState`와 같은 납작한 형태를 유지한다
          baseline: {
            type: patch.type,
            parentOccurrenceId: patch.parentOccurrence?.occurrenceId ?? null,
            common: patch.common,
            typeFieldValues,
            imageS3Key: null,
            imageKept: true,
            areaRects: patch.areaRects,
          },
        };
      }),
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
      set((state) => ({
        image: {
          status: "uploading",
          s3Key: null,
          previewUrl,
          errorMessage: null,
          // 교체 시도 중에도 서버 이미지는 살아 있다 — 실패 복원 지점을 잃지 않는다
          keptPreviewUrl: state.image.keptPreviewUrl,
        },
      })),
    completeImageUpload: (s3Key) =>
      set((state) => ({
        image: {
          ...state.image,
          status: "uploaded",
          s3Key,
          errorMessage: null,
        },
      })),
    // 실패는 s3Key를 남기지 않는다 — 반쯤 올라간 이미지로 제출되는 경로 차단 (AC 8).
    // 수정 모드는 서버 이미지가 그대로 살아 있으므로 그 상태로 되돌린다 (MSG-550 추정 5):
    // 미리보기까지 비우면 "이미지 없음"이 되어 표시와 필수값 판정이 거짓이 된다.
    failImageUpload: (message) =>
      set((state) => ({
        image: {
          status: "failed",
          s3Key: null,
          previewUrl: state.image.keptPreviewUrl,
          errorMessage: message,
          keptPreviewUrl: state.image.keptPreviewUrl,
        },
      })),
    addAreaRect: (rect) =>
      set((state) => ({ areaRects: [...state.areaRects, rect] })),
    removeAreaRect: (index) =>
      set((state) => ({
        areaRects: state.areaRects.filter((_, i) => i !== index),
      })),
    reset: () =>
      set({
        step: "type",
        type: null,
        parentOccurrence: null,
        common: EMPTY_COMMON,
        typeFieldValues: EMPTY_TYPE_FIELDS,
        image: IDLE_IMAGE,
        areaRects: [],
        // 수정 모드 컨텍스트까지 되돌린다 — 남으면 다음 진입이 남의 신청서를 수정 모드로 연다
        editContext: null,
        baseline: null,
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
  imageKept: state.image.keptPreviewUrl !== null,
  // MSG-547이 미룬 1줄 — 제출 본문의 locations 재료다 (MSG-548 인계 계약 이행)
  areaRects: state.areaRects,
});

/** 위저드가 신규 등록인가 수정인가 — editContext 유무가 곧 mode다 (MSG-550) */
export const submissionWizardMode = (
  state: SubmissionWizardState,
): SubmissionWizardMode => (state.editContext === null ? "create" : "edit");

/**
 * 작성 중(dirty) 판정 — 이탈 경고의 근거 (AC 14).
 * 유형만 골라 스텝 1에 머무른 상태는 잃을 입력이 없어 작성 중으로 보지 않는다.
 *
 * 수정 모드는 기준선이 "빈 위저드"가 아니라 **hydrate 시점의 제출값**이다 (MSG-550 AC 9) —
 * 빈 값 대비로 판정하면 프리필 직후 무조건 작성 중이 되어, 사유만 확인하고 나가는 동선에서
 * 경고가 항상 뜬다.
 */
export const isSubmissionDirty = (state: SubmissionWizardState): boolean =>
  state.baseline !== null
    ? hasDraftChanged(state.baseline, toDraftState(state))
    : state.step !== "type" ||
      state.image.s3Key !== null ||
      state.areaRects.length > 0 ||
      Object.values(state.common).some((value) => value !== "") ||
      Object.values(state.typeFieldValues).some((value) => value !== "");
