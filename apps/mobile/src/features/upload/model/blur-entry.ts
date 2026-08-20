/**
 * 블러 확인 화면의 **진입·이탈 계약** (MSG-429 기준 1·2·4·5).
 *
 * 이 화면은 업로드 위저드의 한 단계가 아니라 **알림 진입 확인 화면**이다(MSG-424가 블러를
 * 후처리로 분리). 그래서 진입은 `?videoId` 쿼리 하나에 달려 있고, 이탈은 위저드 전진이
 * 아니라 닫기다. 판정을 화면에 두지 않고 순수 모델로 뺀 이유는 RN 렌더 테스트가 없어서다.
 */

/** 알림 → 확인 화면 경로. 통지 탭·푸시 탭이 공통으로 쓴다 */
export const blurConfirmRoute = (videoId: number): string =>
  `/upload/blur?videoId=${videoId}`;

/**
 * 진입 파라미터 파싱. expo-router의 `useLocalSearchParams`는 값을 `string | string[]`로
 * 준다. **양수 정수만 통과**시킨다 — 딥링크·손상된 푸시 payload로 `/api/videos/abc`
 * 같은 조회가 나가는 것을 여기서 끊는다. 통과 못 하면 화면은 안내 + [확인]으로 종결한다.
 */
export const parseVideoIdParam = (
  raw: string | string[] | undefined,
): number | null => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || !/^[1-9]\d*$/.test(value)) return null;
  return Number(value);
};

/** [확인]·하드웨어 뒤로가기의 목적지 */
export type BlurCloseTarget =
  | { kind: "back" }
  | { kind: "replace"; route: "/home" };

/**
 * 닫기 목적지 판정 (기준 4·5). 푸시 콜드 스타트로 이 화면이 스택의 유일한 항목이면
 * `back()`은 **아무 일도 하지 않아** 사용자가 갇힌다 — 그때는 지도 홈으로 대체 복귀한다.
 */
export const resolveBlurCloseTarget = (canGoBack: boolean): BlurCloseTarget =>
  canGoBack ? { kind: "back" } : { kind: "replace", route: "/home" };

/**
 * 푸시 payload → 확인 화면 경로 (기준 16). FCM `data`는 **문자열 맵**이라 BE가 숫자로
 * 실어도 문자열로 도착할 수 있어 양쪽을 모두 받는다. 형식이 어긋나면 null이고, 그때
 * 알림 탭은 무동작이다 — 잘못된 payload로 엉뚱한 화면을 띄우지 않는다.
 *
 * **키 이름 `videoId`는 BE 계약 미확정 상태의 추정이다**(스펙 추정 1) — 계약이 확정되면
 * 이 함수 한 곳만 바뀐다.
 */
export const resolveBlurPushRoute = (data: unknown): string | null => {
  if (typeof data !== "object" || data === null) return null;
  const raw: unknown = (data as { videoId?: unknown }).videoId;
  if (typeof raw === "number") {
    return Number.isInteger(raw) && raw > 0 ? blurConfirmRoute(raw) : null;
  }
  if (typeof raw !== "string") return null;
  const videoId = parseVideoIdParam(raw);
  return videoId === null ? null : blurConfirmRoute(videoId);
};
