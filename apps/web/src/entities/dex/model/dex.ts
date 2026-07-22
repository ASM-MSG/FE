import type { LatLng } from "@/entities/cell";

/**
 * 개인 도감 요약 — 백엔드가 제공하는 표시값 (MSG-121, 2026-07-22 개정 반영).
 * 지역명은 이 요약에 없다 — 현재 위치 역지오코딩이 소유한다(개정 D2, A5 개정).
 */
export interface DexSummary {
  nickname: string;
  /** 아바타 이미지 URL — 없으면 이니셜 fallback 표시 */
  avatarSrc?: string;
  /**
   * 전체 지도 기준 탐험 진행률(%) — Fog of World식 미소값 (개정 D1, mock 0.012).
   * 표시 전 0~100 클램프(AC 7) + formatExploredPct 포맷(AC 20)을 거친다.
   */
  totalExploredPct: number;
  /** 연속 기록 일수 — "연속 스트릭" 통계 카드 표시값 (헤더 요약에서는 제거 — D1 dedup) */
  streakDays: number;
  /** 수집 격자 수 — 통계 카드 표시값 */
  collectedCellCount: number;
  /** 획득 뱃지 수 — 통계 카드 표시값 */
  badgeCount: number;
}

/** 사용자가 수집한 격자 — 최근 수집 목록·지도 오버레이의 단위 (MSG-121) */
export interface CollectedCell {
  /** 격자 id — entities/cell의 Cell.id와 같은 체계 */
  cellId: string;
  /** 격자 라벨 (예: "서면 A-14") */
  label: string;
  /**
   * 행정구(區) 이름 (예: "부산진구") — 갤러리 지역 매핑 키 (MSG-122 AC 1·4).
   * Cell.district와 같은 체계이며 백엔드 제공 가정(mock은 MOCK_CELLS에서 동기화).
   */
  district: string;
  /** 격자 중심 좌표 — 행 클릭 시 지도 이동 목적지 (AC 16) */
  center: LatLng;
  /** 수집 시각 (ISO 8601) — 최근 수집 목록 최신순 정렬 기준 (AC 14) */
  collectedAt: string;
  /** 이 격자에서 수집(업로드)한 영상 수 — "영상 N개" 표시 (AC 15) */
  videoCount: number;
}

/**
 * 사용자가 수집(업로드)한 개별 영상 — 갤러리 탭 썸네일 그리드의 단위 (MSG-122).
 * 한 격자에 영상이 여러 개면 각각 별도 항목이다 (티켓 명시).
 */
export interface CollectedVideo {
  /**
   * 영상 id — 소속 격자 Cell.videos(CellVideo.id)와 같은 체계 (예: "A-14-v1", ② B3).
   * 썸네일 클릭 시 상세 시트의 활성 영상 매칭 키 (AC 23). 실 API가 Cell.videos에 없는
   * 영상을 내려주면 시트가 대표 영상(videos[0])으로 강등한다 (R8 — mock 전용 보장)
   */
  id: string;
  /** 소속 격자 id — CollectedCell.cellId와 같은 체계, 지역 필터 매칭 키 (AC 1) */
  cellId: string;
  /** 격자 라벨 denormalize (예: "서면 A-14") — 썸네일 대체 텍스트용 (AC 10) */
  cellLabel: string;
  /** 대표 프레임 썸네일 URL — 없으면 placeholder 타일 표시 (CellVideo.thumbnailSrc 관례, R1) */
  thumbnailSrc?: string;
  /** 수집 시각 (ISO 8601) — 갤러리 최신 수집순 정렬 기준 (AC 1) */
  collectedAt: string;
}

/** 도감 조회 응답 — queryKey ["dex"]의 반환 계약 */
export interface DexData {
  summary: DexSummary;
  collectedCells: CollectedCell[];
  /**
   * 지역(구)별 탐험률(%) 맵 (개정 D2) — 값 계산은 백엔드 소관 가정의 mock(A5 개정).
   * 키는 현재 위치 역지오코딩 결과(구 이름)와 매칭하며, 맵에 없는 지역은 0%로 처리한다(AC 21).
   */
  regionExploredPctMap: Record<string, number>;
}
