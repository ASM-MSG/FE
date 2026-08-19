import type { PersistedUploadFlow, UploadFlowState } from "./upload-flow-store";

/**
 * 콜드 스타트·백그라운드 복귀 시 이어갈 화면 판정 (기준 36).
 *
 * 저장된 `step`은 그 자체로는 아무것도 하지 않는다 — 앱 진입점(`app/index.tsx`)이 이 함수로
 * 복귀 라우트를 정해 이동시켜야 "같은 스텝으로 복원된다"가 성립한다.
 * 라우트 문자열만 다루는 순수 매핑이라 라우터를 import하지 않는다(RN 경계 규칙 — 이동은
 * 진입점이 수행한다).
 */
export type UploadResumeRoute =
  | "/upload/analyzing"
  | "/upload/highlight"
  | "/upload/preview";

const ROUTE_BY_STEP = {
  analyzing: "/upload/analyzing",
  highlight: "/upload/highlight",
  preview: "/upload/preview",
} as const satisfies Record<string, UploadResumeRoute>;

/**
 * 이어갈 화면 — 없으면 null(평소대로 지도 홈 부팅).
 *
 * - 선택 스텝은 이어갈 진행이 아니다: 영상을 고르기 전이며, 그 상태는 영속되지도 않는다
 *   (빈 흐름이면 저장소가 비워진다 — 기준 39).
 * - 영상 없이 스텝만 남은 값도 이어가지 않는다: 저장소 형상 검증이 `step`만 보므로
 *   구 버전 잔존 값이 그런 형태로 들어올 수 있고, 그대로 열면 영상 없는 화면이 뜬다.
 */
export const resumeRouteForFlow = (
  persisted: PersistedUploadFlow | null,
): UploadResumeRoute | null => {
  if (persisted === null || persisted.video === null) return null;
  if (persisted.step === "select") return null;
  return ROUTE_BY_STEP[persisted.step];
};

/** 미리보기에서 되돌아갈 화면 — 하이라이트를 거쳤으면 하이라이트, 아니면 선택 */
export type UploadBackRoute = "/upload" | "/upload/highlight";

/**
 * `[이전 단계로]`의 복귀 지점 (기준 22) — **스택 이력이 아니라 흐름 상태가 정한다.**
 *
 * `router.back()`에 맡기면 콜드 스타트로 복원된 흐름에서 깨진다: 복원은
 * `replace("/home") + push(복원 라우트)`로 스택을 만들기 때문에 미리보기가 복원되면
 * 스택이 `[/home, /upload/preview]`뿐이고, 뒤로가 하이라이트가 아니라 **홈으로 나간다**
 * (스토어는 이미 highlight로 전이시켜 놓은 채로). 정상 진입과 복원 진입의 스택이 다르므로
 * 이력에 기대는 판정은 둘 중 하나에서 반드시 틀린다.
 *
 * 추천도 폴백도 없이 하이라이트를 건너뛴 흐름(analyzing → preview)만 선택 화면으로 간다 —
 * 그 흐름에는 돌아갈 하이라이트 화면 자체가 없다.
 */
export const backRouteFromPreview = (
  state: UploadFlowState,
): UploadBackRoute =>
  state.suggestions.length > 0 || state.manualFallback
    ? "/upload/highlight"
    : "/upload";
