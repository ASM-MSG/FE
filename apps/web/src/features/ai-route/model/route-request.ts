import type { Bounds } from "@/entities/cell";
import type {
  RouteRecommendRequestDto,
  ViewportDto,
} from "@/shared/api/generated";
import type { AiRouteStatus } from "./ai-route-store";

/**
 * 추천 요청 조립·제출 판정 (MSG-488 L8·L9).
 * 순수 함수 — 지도 SDK를 모르고 뷰포트를 플랫폼 중립 `Bounds`로 받는다(RN 경계).
 *
 * [MSG-489 확장점] `origin` 병합과 2차 재요청 뷰포트 규칙이 여기에 얹힌다.
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
}: {
  text: string;
  bounds: Bounds | null;
}): RouteRecommendRequestDto | null => {
  const trimmed = text.trim();
  if (bounds === null || trimmed.length === 0) return null;
  return { text: trimmed, viewport: toViewportDto(bounds) };
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
