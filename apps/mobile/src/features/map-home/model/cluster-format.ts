import type { RegionClusterMarker } from "./region-cluster-overlay";
import { THEME_META } from "./themes";

/**
 * 클러스터 마커 개수 서식 (MSG-428 L10) — 천 단위 구분 콤마.
 * 웹(MapCanvas)은 `count.toLocaleString("ko-KR")`을 쓰지만, Hermes의 Intl 가용성은
 * 빌드 설정(intl 변형 포함 여부)에 좌우돼 런타임에 서식이 조용히 달라질 수 있다.
 * 그래서 모바일은 정규식으로 직접 넣고, 표기 동등성은 cluster-format.test.ts가
 * Node의 `toLocaleString("ko-KR")`과 대조해 고정한다.
 * 순수 함수 — 지도 SDK/RN 무의존.
 */
export const formatClusterCount = (count: number): string =>
  String(count).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/**
 * 집계 마커 접근성 이름 (MSG-558 확장 L11) — 웹 `MapCanvas.clusterMarkerTitle`과 같은 4경우.
 * 칩 마커는 세는 대상이 격자가 아니라 그 칩의 대상이라 주어가 칩 라벨이다.
 * 순수 함수 — RN 무의존.
 */
export const clusterMarkerLabel = ({
  name,
  count,
  theme,
}: RegionClusterMarker): string => {
  const subject = theme ? THEME_META[theme].label : "점령 격자";
  return name !== null
    ? `${name} ${subject} ${count}개`
    : `${subject} ${count}개`;
};
