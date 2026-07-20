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

/** 격자에 속한 개별 영상 (상세 시트 "이 격자의 영상" 리스트 항목, MSG-115) */
export interface CellVideo {
  id: string;
  /** 영상 제목 */
  title: string;
  /** 조회수(원시 값) — 표시 시 formatViewCount로 축약 */
  viewCount: number;
  /** 업로드 시각 (ISO 8601) — 표시 시 formatRelativeTime으로 상대 시간화 */
  uploadedAt: string;
  /** 영상 길이(초) */
  durationSec: number;
  /** 썸네일 URL — 없으면 placeholder 표시 */
  thumbnailSrc?: string;
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
  /** 상세 위치 문자열 (예: "서울 마포구 홍대입구") — 상세 시트 표시 (MSG-115) */
  location: string;
  /** 최근 업로드 시각 (ISO 8601) — 상세 시트 상대 시간 표시 (MSG-115) */
  recentUploadedAt: string;
  /** 담수율(%) — 상세 시트 통계 (MSG-115) */
  fillRate: number;
  /** 격자 누적 조회수(원시 값) — 상세 시트 통계, 표시 시 축약 (MSG-115) */
  viewCount: number;
  /** 개별 영상 목록 — 상세 시트 리스트. 대표 영상은 videos[0] (MSG-115) */
  videos: CellVideo[];
}
