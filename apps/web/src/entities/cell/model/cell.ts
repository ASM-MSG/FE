/** 위경도 좌표 (플랫폼 중립) */
export interface LatLng {
  lat: number;
  lng: number;
}

/** 지도 뷰포트 경계 — 남서(sw)/북동(ne) 꼭짓점 좌표 */
export interface Bounds {
  sw: LatLng;
  ne: LatLng;
}

/** 격자 도메인 모델 */
export interface Cell {
  id: string;
  /** 지역명 + 코드 (예: "홍대입구 A-14") */
  label: string;
  /** 격자 중심 좌표 */
  center: LatLng;
  /** 격자에 속한 영상 수 */
  videoCount: number;
}
