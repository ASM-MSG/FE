import { spacing, typography } from "@fillmap/design-tokens";
import { formatClusterCount } from "./cluster-format";
import type { RegionClusterMarker } from "./region-cluster-overlay";

/**
 * 말풍선 마커 크기 추정 (MSG-558 L1~L3) — 모바일 고유 모델.
 * 웹(MapCanvas `clusterMarkerContent`)은 CSS가 지명 길이에 hug하지만, RN 네이버 마커
 * (`NaverMapMarkerOverlay` 커스텀 뷰)는 `width`/`height`가 필수고 텍스트 실측(`onLayout`)은
 * 첫 프레임에 못 쓴다. 그래서 순수 추정으로 박스를 정한다 — 박스는 투명이라 과대는 비용 0,
 * 과소는 잘림. 따라서 계수는 전부 **과대 방향**이다.
 * 순수 함수 — 지도 SDK/RN 무의존.
 */

/** 웹 `pt-1.5` / `pb-1.75` (토큰 없음 — 웹 숫자 스케일 값 그대로) */
export const BUBBLE_PADDING_TOP = 6;
export const BUBBLE_PADDING_BOTTOM = 7;

/**
 * 그림자 번짐 여백 — `shadow.raised` radius 10 + offset 2. 박스가 말풍선에 딱 맞으면
 * 마커 비트맵 경계에서 그림자가 잘린다. 4면에 더한다.
 */
export const SHADOW_BLEED = 12;

/**
 * 글자 폭 계수(× fontSize) — 실측 폰트 메트릭이 아니라 과대 방향 상수다
 * (한글 전각 1.0 · ASCII 숫자/콤마 0.65).
 *
 * 0.6은 **과소**였다. 프로덕션 웹(fillmap.kr)에 웹 클래스 문자열 그대로 요소를 주입해
 * 잰 결과 Inter 숫자 advance는 0.6375em이다. 이름이 있는 마커는 한글 폭이 max를 먹어
 * 안 드러나지만, 이름 없는 버킷(병합·미판정) + 콤마 없는 개수에서 추정이 실측보다
 * 작아진다 — "58"이 실측 44.4 vs 추정 44라 박스가 좁아 숫자가 잘릴 수 있었다.
 * 0.65로 올려 그 창을 닫는다(박스는 투명이라 과대는 비용 0).
 */
const CJK_WIDTH_RATIO = 1;
export const ASCII_WIDTH_RATIO = 0.65;

const estimateTextWidth = (text: string, fontSize: number): number => {
  let width = 0;
  for (const ch of text) {
    width +=
      (ch.charCodeAt(0) < 0x80 ? ASCII_WIDTH_RATIO : CJK_WIDTH_RATIO) *
      fontSize;
  }
  return Math.ceil(width);
};

interface Size {
  width: number;
  height: number;
}

/**
 * `bubble` = 보이는 말풍선(웹 실측 ≈63~66×48), `box` = 마커 뷰 크기(bubble + 그림자 여백).
 * 단위(동/구/시)와 무관 — 웹 MSG-475가 크기 3단을 폐기한 것과 같다.
 */
export const clusterBubbleSize = (
  marker: Pick<RegionClusterMarker, "name" | "count">,
): { bubble: Size; box: Size } => {
  const nameWidth =
    marker.name === null
      ? 0
      : estimateTextWidth(marker.name, typography.label.fontSize);
  const countWidth = estimateTextWidth(
    formatClusterCount(marker.count),
    typography.heading.fontSize,
  );
  const nameHeight = marker.name === null ? 0 : typography.label.lineHeight;
  const bubble = {
    width: 2 * spacing.sm + Math.max(nameWidth, countWidth),
    height:
      BUBBLE_PADDING_TOP +
      nameHeight +
      typography.heading.lineHeight +
      BUBBLE_PADDING_BOTTOM,
  };
  return {
    bubble,
    box: {
      width: bubble.width + 2 * SHADOW_BLEED,
      height: bubble.height + 2 * SHADOW_BLEED,
    },
  };
};
