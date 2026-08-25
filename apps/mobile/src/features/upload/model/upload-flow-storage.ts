import type { PersistedUploadFlow } from "./upload-flow-store";

/**
 * 업로드 진행 상태의 기기 로컬 영속 (기준 36·37·39).
 *
 * 저장소는 **포트로 주입받는다** — 네이티브 모듈(AsyncStorage)을 모델에 직접 들여오면
 * 순수 모델 테스트가 불가능해진다(token-storage의 AuthPersistence 선례). 실제 배선은
 * `upload-flow-persistence.ts`가 한다.
 *
 * 세 함수 모두 **총함수**다(절대 reject하지 않음) — 저장소 접근 실패를 화면이 각자
 * .catch로 방어하는 대신 어댑터 계약으로 흡수한다(onboarding-storage 계약).
 * 읽기 실패·깨진 값 = "진행 없음"으로 폴백한다: 복원 실패로 업로드 자체를 막는 것보다
 * 처음부터 다시 고르게 하는 쪽이 안전하다.
 */

/** AsyncStorage의 구조적 부분집합 — 테스트는 인메모리 가짜를 주입한다 */
export interface KeyValueStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

export const UPLOAD_FLOW_STORAGE_KEY = "fillmap.upload.flow";

export interface UploadFlowStorage {
  load: () => Promise<PersistedUploadFlow | null>;
  save: (value: PersistedUploadFlow) => Promise<void>;
  clear: () => Promise<void>;
}

const VALID_STEPS = new Set(["select", "analyzing", "highlight", "preview"]);

/**
 * 저장값 형상 검증 — **필수 중첩 필드까지 전부 본다.**
 *
 * 스텝만 알아보던 초기 구현은 나머지 필드가 없거나 타입이 어긋나도 그대로 런타임 상태로
 * spread했다. 구버전 데이터나 부분 기록된 AsyncStorage 값에서 실제로 도달 가능하고, 그때
 * 화면이 `suggestions.length`·`presign.s3Key` 같은 접근을 하다 **안전하게 버리는 대신
 * 크래시한다**(codex 리뷰 2회차 P1). 기준 37의 "예외를 밖으로 던지지 않고 '진행 없음'으로
 * 폴백"은 읽기 실패만이 아니라 **읽기 성공 + 내용 불량**에도 적용돼야 한다.
 *
 * 검증에 실패하면 조용히 null(진행 없음)이다 — 복원 실패로 업로드 자체를 막는 것보다
 * 처음부터 다시 고르게 하는 쪽이 안전하다는 기존 판단을 그대로 따른다.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

/** null 허용 필드 검사 — null이면 통과, 아니면 주어진 판정을 적용 */
const isNullOr = (value: unknown, check: (v: unknown) => boolean): boolean =>
  value === null || check(value);

const isSegmentLike = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.start === "number" &&
  typeof value.end === "number";

const isSuggestion = (value: unknown): boolean =>
  isSegmentLike(value) && typeof (value as { id: unknown }).id === "string";

const isVideo = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.uri === "string" &&
  typeof value.fileName === "string" &&
  isNullOr(value.durationSec, (v) => typeof v === "number") &&
  isNullOr(value.fileSize, (v) => typeof v === "number") &&
  isNullOr(value.mimeType, (v) => typeof v === "string");

const isSelection = (value: unknown): boolean => {
  if (!isRecord(value)) return false;
  if (!isSegmentLike(value.manualSegment)) return false;
  if (value.mode === "manual") return value.selectedAi === null;
  return value.mode === "ai" && isSuggestion(value.selectedAi);
};

const isPresign = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.uploadUrl === "string" &&
  typeof value.s3Key === "string" &&
  typeof value.expiresInSec === "number" &&
  typeof value.issuedAtMs === "number";

const isOrchestration = (value: unknown): boolean =>
  isRecord(value) &&
  typeof value.s3PutDone === "boolean" &&
  isNullOr(value.presign, isPresign);

const isPersistedUploadFlow = (value: unknown): value is PersistedUploadFlow =>
  isRecord(value) &&
  VALID_STEPS.has(value.step as string) &&
  typeof value.manualFallback === "boolean" &&
  isNullOr(value.video, isVideo) &&
  Array.isArray(value.suggestions) &&
  value.suggestions.every(isSuggestion) &&
  isNullOr(value.selection, isSelection) &&
  isOrchestration(value.analysis) &&
  isOrchestration(value.confirm);

export const createUploadFlowStorage = (
  storage: KeyValueStorage,
): UploadFlowStorage => ({
  load: async () => {
    try {
      const raw = await storage.getItem(UPLOAD_FLOW_STORAGE_KEY);
      if (raw === null) return null;
      const parsed: unknown = JSON.parse(raw);
      return isPersistedUploadFlow(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },
  save: async (value) => {
    try {
      await storage.setItem(UPLOAD_FLOW_STORAGE_KEY, JSON.stringify(value));
    } catch {
      // best-effort — 저장 실패로 진행 중인 업로드를 막지 않는다 (재진입 복원만 못 할 뿐)
    }
  },
  clear: async () => {
    try {
      await storage.removeItem(UPLOAD_FLOW_STORAGE_KEY);
    } catch {
      // best-effort
    }
  },
});
