import type { LatLng } from "@/entities/cell";

/**
 * 개인 도감 요약 — 백엔드가 제공하는 표시값 (MSG-121).
 * 지역명·탐험률은 프론트가 뷰포트/위치로 계산하지 않는다(추정 A5 — 지역 판정은 백엔드 소관).
 */
export interface DexSummary {
  nickname: string;
  /** 아바타 이미지 URL — 없으면 이니셜 fallback 표시 */
  avatarSrc?: string;
  /** 전체 탐험 라벨 (예: "서울") — "서울 N% 탐험" 요약 문구용 */
  totalLabel: string;
  /** 전체 탐험률(%) — 표시 전 0~100 클램프 (AC 7) */
  totalExploredPct: number;
  /** 연속 기록 일수 (예: 23일 연속 기록 · 연속 스트릭 카드) */
  streakDays: number;
  /** 수집 격자 수 — 통계 카드 표시값 */
  collectedCellCount: number;
  /** 획득 뱃지 수 — 통계 카드 표시값 */
  badgeCount: number;
  /** 현재 지역명 (예: "마포구") — "{지역} 탐험률" 라벨용 */
  regionName: string;
  /** 현재 지역 탐험률(%) — 표시 전 0~100 클램프 (AC 7) */
  regionExploredPct: number;
}

/** 사용자가 수집한 격자 — 최근 수집 목록·지도 오버레이의 단위 (MSG-121) */
export interface CollectedCell {
  /** 격자 id — entities/cell의 Cell.id와 같은 체계 */
  cellId: string;
  /** 격자 라벨 (예: "홍대입구 A-14") */
  label: string;
  /** 격자 중심 좌표 — 행 클릭 시 지도 이동 목적지 (AC 16) */
  center: LatLng;
  /** 수집 시각 (ISO 8601) — 최근 수집 목록 최신순 정렬 기준 (AC 14) */
  collectedAt: string;
  /** 이 격자에서 수집(업로드)한 영상 수 — "영상 N개" 표시 (AC 15) */
  videoCount: number;
}

/** 도감 조회 응답 — queryKey ["dex"]의 반환 계약 */
export interface DexData {
  summary: DexSummary;
  collectedCells: CollectedCell[];
}
