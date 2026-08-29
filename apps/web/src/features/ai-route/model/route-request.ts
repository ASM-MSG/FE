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
 * MSG-489가 출발지 병합(L11)·0.5도 예방 판정(L12)·버튼 문구(L13)·2차 대기(Q2)를 얹었다.
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

/** 서버 뷰포트 상한 (14401) — 위·경도 한 변이 이 값을 넘으면 요청이 거절된다 */
const MAX_VIEWPORT_SPAN_DEG = 0.5;

/**
 * 요청 전 축척 정규화가 필요한가 (L12, A2).
 * 참이면 호출부가 1km 단으로 줌을 맞추고 새 뷰포트가 반영된 뒤 보낸다 —
 * bounds를 잘라 보내지 않는다(사용자가 보는 화면과 요청 범위를 어긋나게 두지 않는다).
 */
export const needsSpanNormalize = (bounds: Bounds | null): boolean => {
  if (bounds === null) return false;
  return (
    bounds.ne.lat - bounds.sw.lat > MAX_VIEWPORT_SPAN_DEG ||
    bounds.ne.lng - bounds.sw.lng > MAX_VIEWPORT_SPAN_DEG
  );
};

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
