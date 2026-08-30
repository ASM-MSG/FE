import type { RoutePointDto } from "@/shared/api/generated";

/**
 * 추천 지점 표시 텍스트 파생 (MSG-488 L1·L2·L4).
 * 순수 함수 — 지도 SDK·플랫폼·라우터에 의존하지 않는다(RN 재사용 대상).
 * 색 클래스는 여기서 만들지 않는다 — tone(의미)만 내보내고 tailwind 매핑은 뷰가 소유한다.
 */

/** kind 태그 색 계열 — 뷰가 theme-* 토큰 클래스로 옮긴다 (§6) */
export type RouteKindTone = "place" | "festival" | "popup" | "route";

export interface RouteKindTag {
  label: string;
  tone: RouteKindTone;
}

/**
 * 서버 kind → 사용자 언어 태그 (L2).
 * `EVENT`와 `MISSION_FESTIVAL`은 같은 festival 톤을 쓴다 — Figma가 "행사"만 보라로 그렸고
 * 두 종류는 글자로 구분한다(승인 Q3).
 * 서버 타입이 `string`(enum 아님)이라 미지 문자열이 올 수 있다 — 그때는 태그를 표시하지
 * 않는다(null). 카드 자체는 정상 렌더된다 (R4).
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

/**
 * 표시명 줄 조립 (L1, 승인 Q2) — `[zoneName zoneCell] · [regionName]`을 non-null만 남겨 잇는다.
 * Figma 정본이 "서면 A-14 · 부산 부산진구" 두 조각을 함께 보여준다. 둘 다 없으면 null(줄 생략).
 */
export const stopMetaLine = (
  point: Pick<RoutePointDto, "zoneName" | "zoneCell" | "regionName">,
): string | null => {
  const zone = [point.zoneName, point.zoneCell].filter(Boolean).join(" ");
  const parts = [zone, point.regionName].filter(
    (part): part is string => typeof part === "string" && part.length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : null;
};

/**
 * 결과 부족 배너 문구 (L4) — 서버 `notice`는 **null 여부 신호로만** 읽고 문구는 FE 고정이다.
 * 개수는 실제 렌더된 카드 수(points.length)를 그대로 넣는다.
 */
export const partialBannerText = (
  notice: string | null,
  count: number,
): string | null =>
  notice === null
    ? null
    : `조건에 맞는 곳을 ${count}곳만 찾았어요. 문장을 바꾸거나 다른 지역에서 다시 짜 보세요`;
