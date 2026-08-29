import type { Bounds } from "@/entities/cell";
import type {
  OriginDto,
  RouteRecommendRequestDto,
  ViewportDto,
} from "@/shared/api/generated";
import type { AiRouteStatus } from "./ai-route-store";

/**
 * 추천 요청 조립·제출 판정 (MSG-488 L8·L9).
 * 순수 함수 — 지도 SDK를 모르고 뷰포트를 플랫폼 중립 `Bounds`로 받는다(RN 경계).
 *
 * MSG-489가 출발지 병합(L11)·축척 정규화 판정(L20·L24)·버튼 문구(L13)·2차 대기(Q2)를 얹었다.
 */

/** 서버 계약 상한 (RouteRecommendRequestDto.text: trim 후 1~500자) */
export const MAX_ROUTE_TEXT_LENGTH = 500;

/** 지도 뷰포트 → 서버 사각형 (L9) */
export const toViewportDto = ({ sw, ne }: Bounds): ViewportDto => ({
  minLat: sw.lat,
  minLng: sw.lng,
  maxLat: ne.lat,
  maxLng: ne.lng,
});

/**
 * 요청 본문 조립 (L9) — 지도가 준비되기 전(bounds null)이거나 빈 문장이면 null이다.
 * null이면 호출부가 요청을 보내지 않는다(제출 무시).
 */
export const buildRecommendBody = ({
  text,
  bounds,
  origin,
}: {
  text: string;
  bounds: Bounds | null;
  /** 출발지 — 판정은 route-origin 소유. 없으면 키 자체를 싣지 않는다 (L11) */
  origin?: OriginDto | null;
}): RouteRecommendRequestDto | null => {
  const trimmed = text.trim();
  if (bounds === null || trimmed.length === 0) return null;
  const body: RouteRecommendRequestDto = {
    text: trimmed,
    viewport: toViewportDto(bounds),
  };
  return origin ? { ...body, origin } : body;
};

/**
 * 요청 전 축척 정규화가 필요한가 (L20·L21, D10).
 * 추천은 **항상 1km 단 뷰포트**에서만 나간다 — 참이면 호출부가 줌을 먼저 맞추고
 * 새 뷰포트가 반영된 뒤 보낸다(bounds를 잘라 보내지 않는다). 거짓이면 즉시 발사한다:
 * 이미 목표 단인데 줌 명령을 내면 지도가 `idle`을 내지 않아 요청이 영영 안 나간다 (L21).
 *
 * 목표 줌 단은 파라미터로 받는다 — 이 모듈은 지도 축척 상수(features/map-home)를
 * import하지 않는다(RN 경계·feature 경계). 값 주입은 뷰-레이어 훅 몫이다.
 * 내림 비교인 이유: 축척 라벨(map-scale)이 내림 기준이라 13.4도 사용자에게는 "1km"다.
 *
 * MSG-489 §11에서 0.5도 상한 판정(`needsSpanNormalize`, A2)을 대체했다.
 * 단 §11이 함께 적은 "항상 1km면 14401이 구조적으로 불가능"은 §12에서 반증됐다 —
 * 정착 대기 상한이 만료되는 출구(D13)는 이 판정을 거치지 않는다.
 * 최종 방어선은 아래 `exceedsViewportSpan`이다.
 */
export const needsZoomNormalize = ({
  zoom,
  targetZoom,
}: {
  zoom: number;
  targetZoom: number;
}): boolean => Math.floor(zoom) !== targetZoom;

/**
 * 서버 뷰포트 상한 (developCode 14401) — 요청 사각형의 한 변이 이 값을 넘으면 400이다.
 *
 * MSG-489 §11이 "항상 1km 정규화면 14401은 구조적으로 불가능"이라며 이 상수와
 * `needsSpanNormalize`를 폐기했으나, §12 검증에서 **반증**됐다: 숨은 탭에서는 지도가
 * `idle`을 내지 않아 뷰포트가 갱신되지 않는데, D13의 종결 출구(정착 상한 만료)가
 * 그 옛 bounds로 그대로 쏴 줌 9의 1.9379° × 4.7461° 요청이 나가 400을 맞았다(실측).
 *
 * 그래서 **정규화 트리거가 아니라 발사 직전 최종 가드**로만 되살렸다 —
 * 정상 경로의 "항상 1km"(D10)는 그대로이고, 이 판정은 정착 실패 경로에서만 참이 된다.
 */
export const MAX_VIEWPORT_SPAN_DEG = 0.5;

/**
 * 보내려는 사각형이 서버 상한을 넘는가 (§12) — 참이면 호출부는 요청을 보내지 않고
 * 안내로 종결한다(확정 400을 대신 맞아 주지 않는다). 판정 대상은 **실제로 실릴 body의
 * viewport**라, 어떤 경로로 조립됐든 같은 가드를 통과한다.
 * 상한 값은 파라미터로 받는다 — 테스트가 값을 고정하고, 서버 계약이 바뀌어도 호출부만 고친다.
 */
export const exceedsViewportSpan = ({
  viewport,
  maxSpanDeg,
}: {
  viewport: ViewportDto;
  maxSpanDeg: number;
}): boolean =>
  viewport.maxLat - viewport.minLat > maxSpanDeg ||
  viewport.maxLng - viewport.minLng > maxSpanDeg;

/**
 * 목표 뷰포트 도달 판정 (L24·D12) — 2차 자동 재요청의 발사 조건.
 * "이동 명령이 지도에 반영됐고(bounds 참조 교체) 줌이 목표 단"일 때만 참이라,
 * 대기 중 사용자가 지도를 만져도 2차가 엉뚱한 뷰포트로 나가지 않는다(지도는 잠그지 않는다).
 *
 * `boundsAtCommand`가 null이면 이 마운트에서 이동 명령을 내지 않은 것이다(섹션 재진입, A7) —
 * 이동은 이전 마운트에서 이미 정착했으므로 도달로 본다.
 */
export const reachedTargetViewport = ({
  bounds,
  boundsAtCommand,
  zoom,
  targetZoom,
}: {
  bounds: Bounds | null;
  /** 이동 명령을 낸 시점의 bounds — 새 bounds가 들어오면 참조가 바뀐다 */
  boundsAtCommand: Bounds | null;
  zoom: number;
  targetZoom: number;
}): boolean => {
  if (bounds === null) return false;
  if (boundsAtCommand === null) return true;
  return (
    bounds !== boundsAtCommand && !needsZoomNormalize({ zoom, targetZoom })
  );
};

/**
 * 지도 정착 대기 상한 (D13) — 목표 도달 판정이 성립하지 않아도 이 시간이 지나면
 * 현재 뷰포트로 보낸다. 사용자가 대기 중 줌을 되돌리면 목표에 영영 닿지 않는데,
 * 그때 패널이 로딩에 갇히는 것을 막는 유일한 출구다. 어떤 경로로도 요청은 1회 종결한다.
 */
export const VIEWPORT_SETTLE_TIMEOUT_MS = 3_000;

/** 제출 버튼 문구 (L13·D9) — 출발지를 실어 보낸 결과 화면만 "현재 위치에서" 접두가 붙는다 */
export const submitLabel = ({
  status,
  originSent,
}: {
  status: AiRouteStatus;
  /** 직전 요청이 origin을 실어 보냈는가 */
  originSent: boolean;
}): string => {
  if (status === "idle") return "동선 짜기";
  return originSent ? "현재 위치에서 다시 짜기" : "다시 짜기";
};

/**
 * 2차 자동 재요청 대기 시간 (Q2 안 B).
 * 서버 재요청 제한(14429)은 **요청 시작 기준 10초 창**이고 자동 재요청도 예외가 아니다
 * (2026-08-28 실측: 1차 응답 직후 재호출 = 14429, 1차 시작 +11s = 200).
 * 여유 500ms를 얹어 창을 확실히 넘긴 뒤 발사한다.
 */
export const SECONDARY_MIN_INTERVAL_MS = 10_500;

export const secondaryDelayMs = ({
  requestedAt,
  now,
}: {
  /** 1차 요청을 쏜 시각 — 모르면 기다리지 않는다 */
  requestedAt: number | null;
  now: number;
}): number => {
  if (requestedAt === null) return 0;
  return Math.max(0, requestedAt + SECONDARY_MIN_INTERVAL_MS - now);
};

/**
 * 제출 가능 판정 (L8) — trim 후 1~500자 && 요청 중 아님 && 기능 켜짐 && 지도 준비됨.
 *
 * `mapReady`(= 뷰포트 bounds 확보)를 포함하는 이유: 이 판정이 참인데
 * `buildRecommendBody`가 null을 내면 버튼은 활성인 채 클릭이 아무 일도 하지 않는
 * "눌러도 안 되는 버튼"이 된다(지도 초기화가 느리거나 실패한 경우 — codex 리뷰 P2).
 * 두 함수의 성립 조건을 같게 유지한다.
 */
export const canSubmit = ({
  text,
  status,
  featureDisabled,
  mapReady,
}: {
  text: string;
  status: AiRouteStatus;
  featureDisabled: boolean;
  /** 요청 뷰포트를 만들 수 있는가 — `viewport-store.bounds !== null` */
  mapReady: boolean;
}): boolean => {
  const length = text.trim().length;
  return (
    length > 0 &&
    length <= MAX_ROUTE_TEXT_LENGTH &&
    status !== "loading" &&
    !featureDisabled &&
    mapReady
  );
};
