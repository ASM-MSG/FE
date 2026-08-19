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
