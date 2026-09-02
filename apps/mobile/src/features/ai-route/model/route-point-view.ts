import type { RoutePointDto } from "../../../shared/api/sdk";

/**
 * 추천 지점 표시 텍스트 파생 — 웹 `features/ai-route/model/route-point-view.ts` 복제본
 * (MSG-556, 동등성은 route-point-view.parity.test.ts). 순수 함수 — 지도 SDK·플랫폼·
 * 라우터에 의존하지 않는다. 색 클래스는 여기서 만들지 않는다 — tone(의미)만 내보내고
 * NativeWind 매핑은 뷰(`route-stop-card`)가 소유한다.
 */

/** kind 태그 색 계열 — 뷰가 theme-* 토큰 클래스로 옮긴다 (§6) */
export type RouteKindTone = "place" | "festival" | "popup" | "route";

export interface RouteKindTag {
  label: string;
  tone: RouteKindTone;
}

/**
 * 서버 kind → 사용자 언어 태그 (L1). `EVENT`와 `MISSION_FESTIVAL`은 같은 festival 톤 —
 * 글자로 구분한다(웹 승인 Q3). 서버 타입이 `string`이라 미지 문자열은 태그 없음(null).
 */
const KIND_TAGS: Record<string, RouteKindTag> = {
  PLACE: { label: "장소", tone: "place" },
  EVENT: { label: "행사", tone: "festival" },
  MISSION_FESTIVAL: { label: "축제", tone: "festival" },
  MISSION_POPUP: { label: "팝업", tone: "popup" },
  MISSION_COURSE: { label: "코스", tone: "route" },
};

export const kindTag = (kind: string): RouteKindTag | null =>
  KIND_TAGS[kind] ?? null;

/** 표시명 줄 (L2) — `[zoneName zoneCell] · [regionName]`을 non-null만 남겨 잇는다. 둘 다 없으면 null */
export const stopMetaLine = (
  point: Pick<RoutePointDto, "zoneName" | "zoneCell" | "regionName">,
): string | null => {
  const zone = [point.zoneName, point.zoneCell].filter(Boolean).join(" ");
  const parts = [zone, point.regionName].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
};

/** 결과 부족 배너 문구 (L3) — 서버 `notice`는 null 여부 신호로만 읽고 문구는 FE 고정이다 */
export const partialBannerText = (
  notice: string | null,
  count: number,
): string | null =>
  notice === null
    ? null
    : `조건에 맞는 곳을 ${count}곳만 찾았어요. 문장을 바꾸거나 다른 지역에서 다시 짜 보세요`;
