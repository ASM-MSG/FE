/**
 * 행사 업로드 대상 (MSG-560 D11·D12) — 웹 `upload-modal-store.ts`의 `EventUploadTarget`
 * 로컬 정의 미러 + `wizard-mode.ts`의 위치 라벨 포팅. `features/event`를 import하지 않는다
 * (교차 feature 회피 — 웹과 같은 판단). 순수 함수.
 */
export interface EventUploadTarget {
  occurrenceId: number;
  locationId: number;
  /** 행사명 — 위저드 위치 라벨 재료 */
  occurrenceTitle: string;
  /** 위치명 — 위저드 위치 라벨 재료 */
  locationName: string;
}

/**
 * 행사 모드 위치 라벨 — 귀속이 URL path로 결정돼 좌표를 보내지 않으므로 역지오코딩
 * 행정동 대신 `{행사명} · {위치명}`을 표기한다 (웹 `eventUploadLabel` 동등).
 */
export const eventUploadLabel = (
  occurrenceTitle: string,
  locationName: string,
): string => `${occurrenceTitle} · ${locationName}`;

/**
 * 저장값 형상 검증 (D11) — AsyncStorage에서 돌아온 대상이 4필드 온전한지 본다.
 * 형상이 깨진 값으로 플로우를 재개하면 확정이 없는 경로로 나가므로 진행을 버린다
 * (`upload-flow-storage`의 기존 판단과 같다).
 */
export const isEventUploadTarget = (
  value: unknown,
): value is EventUploadTarget => {
  if (typeof value !== "object" || value === null) return false;
  const target = value as Record<string, unknown>;
  return (
    typeof target.occurrenceId === "number" &&
    typeof target.locationId === "number" &&
    typeof target.occurrenceTitle === "string" &&
    typeof target.locationName === "string"
  );
};
