import type { Bounds } from "../../../entities/cell/model/grid";
import type {
  RouteRecommendRequestDto,
  ViewportDto,
} from "../../../shared/api/sdk";
import type { AiRouteStatus } from "./ai-route-store";

/**
 * 추천 요청 조립·제출 판정 — 웹 `features/ai-route/model/route-request.ts`의 **부분 복제본**
 * (MSG-556, 동등성은 route-request.parity.test.ts). 순수 함수 — 지도 SDK를 모르고 뷰포트를
 * 플랫폼 중립 `Bounds`로 받는다. MSG-489 산물(출발지 `origin`·축척 정규화 판정·2차 대기·
 * `submitLabel`)은 복제하지 않았다 — 그 티켓이 포팅한다.
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
}: {
  text: string;
  bounds: Bounds | null;
}): RouteRecommendRequestDto | null => {
  const trimmed = text.trim();
  if (bounds === null || trimmed.length === 0) return null;
  return { text: trimmed, viewport: toViewportDto(bounds) };
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
