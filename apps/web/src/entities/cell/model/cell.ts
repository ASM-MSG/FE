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
  /** 행정구(區) 이름 (예: "마포구") — 지역 필터 매칭 키 (MSG-114 D1) */
  district: string;
  /** 격자 중심 좌표 */
  center: LatLng;
  /** 격자에 속한 영상 수 */
  videoCount: number;
  /** 격자 생성 시각 (ISO 8601) — "최신순" 정렬 기준 (D3) */
  createdAt: string;
  /** 대표 영상 길이(초) — 카드 길이 배지용. 없으면 배지 미표시 (S6) */
  durationSec?: number;
}
