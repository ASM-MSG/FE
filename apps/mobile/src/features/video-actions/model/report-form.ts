import type { ReportReasonId } from "./report";

/**
 * 신고 모달 폼의 로컬 상태 전이 (MSG-431 재작업 — 회귀 ① 수정, L16).
 *
 * **컴포넌트 밖 순수 함수로 뽑은 이유**: 모바일에는 RN 렌더 테스트 인프라가 없어
 * (`vitest.config.ts` 정책) `useState` 안에 두면 "닫힐 때 초기화된다"는 계약을 단정할
 * 지점이 사라진다. 실제로 그 계약이 조용히 깨진 채(제출 경로에서 `reset()` 유실)
 * 테스트 576건 전건 통과로 검증까지 넘어간 것이 이 회귀다 — 리셋 전이를 여기로 옮겨야
 * 테스트가 잡는다.
 *
 * **닫힘 = 리셋**이 정본이다. 웹(`apps/web/.../ReportDialog.tsx`)은 모든 닫힘이
 * `handleOpenChange`로 모여 거기서 `setReasonId(null)`을 한다. 모바일 `ReportModal`은
 * `visible` prop으로만 닫히고(성공·중복 신고는 화면이 `setReportTarget(null)`로 내린다)
 * 언마운트되지 않으므로, 닫힘을 명시 이벤트로 받아 초기 상태로 돌린다.
 *
 * **실패 재시도는 선택을 유지한다 — 웹과 같은 동작이다.** 실패 안내가 "잠시 후 다시
 * 시도해 주세요"인데 사유까지 지우면 [신고 제출]이 비활성으로 돌아가 안내와 화면이
 * 어긋나고, 사용자는 같은 사유를 다시 골라야 한다. 리셋은 닫힘 경로에만 건다.
 *
 * 모바일 전용 모듈이라 parity 대상이 아니다 — 웹에는 대응 모듈이 없다(컴포넌트 인라인
 * `useState`). 갈라지는 것은 상태를 두는 자리뿐이고, 계약(닫힘=리셋·실패=유지)은 같다.
 */
export interface ReportFormState {
  /** 선택한 신고 사유 — null이면 [신고 제출] 비활성 */
  selected: ReportReasonId | null;
  /** 사유 목록 펼침 여부 */
  expanded: boolean;
}

/** 미선택·접힘 — 모달을 처음 열었을 때와 닫은 뒤의 상태 */
export const EMPTY_REPORT_FORM: ReportFormState = {
  selected: null,
  expanded: false,
};

export type ReportFormEvent =
  /** 모달이 닫혔다 — 취소·딤 탭·Android back·제출 성공·중복 신고를 모두 포함한다 */
  | { type: "closed" }
  | { type: "selectReason"; reasonId: ReportReasonId }
  | { type: "toggleReasonList" };

export const reportFormReducer = (
  state: ReportFormState,
  event: ReportFormEvent,
): ReportFormState => {
  switch (event.type) {
    case "closed":
      return EMPTY_REPORT_FORM;
    case "selectReason":
      // 사유를 고르면 목록은 접힌다 — 선택 결과가 셀렉트 필드에 바로 보여야 한다
      return { selected: event.reasonId, expanded: false };
    case "toggleReasonList":
      return { ...state, expanded: !state.expanded };
  }
};
