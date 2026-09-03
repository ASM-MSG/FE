import type { Bounds } from "../../../entities/cell/model/grid";
import type {
  OriginDto,
  RouteRecommendRequestDto,
  ViewportDto,
} from "../../../shared/api/sdk";
import type { AiRouteStatus } from "./ai-route-store";

/**
 * 추천 요청 조립·제출 판정 — 웹 `features/ai-route/model/route-request.ts`의 복제본
 * (MSG-556 + MSG-559, 동등성은 route-request.parity.test.ts). 순수 함수 — 지도 SDK도
 * 시계도 모르고 뷰포트를 플랫폼 중립 `Bounds`로, 시각·가시성을 파라미터로 받는다.
 * MSG-559가 웹 MSG-489 산물(출발지 `origin` 병합·축척 정규화 판정·서버 상한 최종 가드·
 * 정착 마감·2차 대기·`submitLabel`)을 마저 포팅해 이제 웹과 전량 대조된다.
 */

/** 서버 계약 상한 (RouteRecommendRequestDto.text: trim 후 1~500자) */
export const MAX_ROUTE_TEXT_LENGTH = 500;

/** 지도 뷰포트 → 서버 사각형 */
export const toViewportDto = ({ sw, ne }: Bounds): ViewportDto => ({
  minLat: sw.lat,
  minLng: sw.lng,
  maxLat: ne.lat,
  maxLng: ne.lng,
});

/**
 * 요청 본문 조립 — 지도가 준비되기 전(bounds null)이거나 빈 문장이면 null이다.
 * null이면 호출부가 요청을 보내지 않는다(제출 무시).
 */
export const buildRecommendBody = ({
  text,
  bounds,
  origin,
}: {
  text: string;
  bounds: Bounds | null;
  /** 출발지 — 판정은 route-origin 소유. 없으면 키 자체를 싣지 않는다 (L1) */
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
 * 요청 전 축척 정규화가 필요한가 (L4, 웹 D10).
 * 추천은 **항상 1km 단 뷰포트**에서만 나간다 — 참이면 호출부가 줌을 먼저 맞추고
 * 새 뷰포트가 반영된 뒤 보낸다(bounds를 잘라 보내지 않는다). 거짓이면 즉시 발사한다:
 * 이미 목표 단인데 카메라 명령을 내면 지도가 `onCameraIdle`을 내지 않아 요청이 영영 안 나간다.
 *
 * 목표 줌 단은 파라미터로 받는다 — 이 모듈은 지도 축척 상수(features/map-home)를
 * import하지 않는다(RN 경계·feature 경계). 값 주입은 뷰-레이어 훅 몫이다.
 * 내림 비교인 이유: 축척 라벨(map-scale)이 내림 기준이라 13.4도 사용자에게는 "1km"다.
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
 * 정규화 트리거가 아니라 **발사 직전 최종 가드**다: 정상 경로("항상 1km")에서는 결코 참이
 * 아니고, 지도가 정착하지 못한 채 상한이 만료되는 출구에서만 참이 된다 (웹 §12 실측).
 */
export const MAX_VIEWPORT_SPAN_DEG = 0.5;

/**
 * 보내려는 사각형이 서버 상한을 넘는가 (L5) — 참이면 호출부는 요청을 보내지 않고
 * 안내로 종결한다(확정 400을 대신 맞아 주지 않는다). 판정 대상은 **실제로 실릴 body의
 * viewport**라, 어떤 경로로 조립됐든 같은 가드를 통과한다.
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
 * 목표 뷰포트 도달 판정 (L4) — 2차 자동 재요청의 발사 조건.
 * "이동 명령이 지도에 반영됐고(bounds 참조 교체) 줌이 목표 단"일 때만 참이라,
 * 대기 중 사용자가 지도를 만져도 2차가 엉뚱한 뷰포트로 나가지 않는다(지도는 잠그지 않는다).
 *
 * `boundsAtCommand`가 null이면 이 마운트에서 이동 명령을 내지 않은 것이다(탭 왕복 재마운트) —
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
 * 지도 정착 대기 상한 (L6) — 목표 도달 판정이 성립하지 않아도 이 시간이 지나면
 * 현재 뷰포트로 보낸다. 사용자가 대기 중 줌을 되돌리면 목표에 영영 닿지 않는데,
 * 그때 시트가 로딩에 갇히는 것을 막는 유일한 출구다. 어떤 경로로도 요청은 1회 종결한다.
 */
export const VIEWPORT_SETTLE_TIMEOUT_MS = 3_000;

/** 대기 사이클 1회의 마감 — 호출부(뷰-레이어 훅)가 ref에 들고 다닌다 */
export interface SettleDeadline {
  /** 절대 마감 시각(ms) — 숨은(백그라운드) 구간만큼 뒤로 밀린다 */
  deadlineAt: number;
  /** 현재 숨김 구간이 시작된 시각. 보이는 중이면 null */
  hiddenSince: number | null;
}

/**
 * 정착 대기의 남은 상한 (L6, 웹 §13 P2).
 *
 * 대기 이펙트는 `bounds`·`zoom`이 갱신될 때마다 재실행되는데, 그때마다 상한을 처음부터
 * 다시 재면 사용자가 계속 패닝·줌하는 동안 종결이 **무한히 연기**돼 시트가 로딩에 갇힌다.
 * 그래서 마감은 사이클당 **한 번만** 정하고(`deadline === null`인 첫 호출), 이후 재실행은
 * 남은 시간만 돌려받아 그만큼만 다시 스케줄한다. 0이면 즉시 종결이다.
 *
 * 다만 마감은 **가시 상태에서 흐른 시간**만 소모한다 — 앱이 백그라운드면 지도가 정착할 수
 * 없고 JS 타이머도 지연되므로, 그 구간을 세면 갱신되지 않은 옛 뷰포트로 발사돼 14401을
 * 맞는다. 숨은 동안 마감을 정지시키는 대신 **복귀 시 숨어 있던 만큼 마감을 뒤로 민다**
 * (같은 결과이고 상태가 두 값뿐이다). 시각(`now`)과 가시성은 파라미터로 받는다 —
 * 이 모듈은 시계도 `AppState`도 모른다(RN 경계).
 */
export const advanceSettleDeadline = ({
  deadline,
  now,
  visible,
  timeoutMs,
}: {
  /** 진행 중인 대기의 마감. null이면 이번 호출이 이 사이클의 첫 예약이다 */
  deadline: SettleDeadline | null;
  now: number;
  visible: boolean;
  timeoutMs: number;
}): { deadline: SettleDeadline; remainingMs: number } => {
  const next = ((): SettleDeadline => {
    if (deadline === null) {
      return { deadlineAt: now + timeoutMs, hiddenSince: visible ? null : now };
    }
    if (!visible) {
      // 숨김 시작 시각은 첫 관측으로 고정한다 — 재실행이 구간을 잘게 쪼개면 안 된다
      return deadline.hiddenSince === null
        ? { ...deadline, hiddenSince: now }
        : deadline;
    }
    if (deadline.hiddenSince === null) return deadline;
    return {
      deadlineAt: deadline.deadlineAt + (now - deadline.hiddenSince),
      hiddenSince: null,
    };
  })();

  return { deadline: next, remainingMs: Math.max(0, next.deadlineAt - now) };
};

/** 제출 버튼 문구 (L8) — 출발지를 실어 보낸 결과 화면만 "현재 위치에서" 접두가 붙는다 */
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
 * 2차 자동 재요청 대기 시간 (L6).
 * 서버 재요청 제한(14429)은 **요청 시작 기준 10초 창**이고 자동 재요청도 예외가 아니다
 * (웹 2026-08-28 실측: 1차 응답 직후 재호출 = 14429, 1차 시작 +11s = 200).
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
 * 제출 가능 판정 — trim 후 1~500자 && 요청 중 아님 && 기능 켜짐 && 지도 준비됨.
 * `mapReady`를 포함해 `buildRecommendBody`의 성립 조건과 같게 유지한다 — 판정이 참인데
 * 본문이 null이면 "눌러도 안 되는 버튼"이 된다 (웹 codex 리뷰 P2).
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
  /** 요청 뷰포트를 만들 수 있는가 — 화면 `viewport.bounds !== null` */
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
