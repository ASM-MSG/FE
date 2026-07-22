import { MOCK_CELLS } from "@/entities/cell";
import type { CollectedCell, DexData } from "./dex";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 상대 시간 표시가 항상 자연스럽게 보이도록 로드 시점 기준 과거 ISO를 만든다 (mock 전용, mock-cells 패턴). */
const isoAgo = (ms: number) => new Date(Date.now() - ms).toISOString();

/**
 * 수집 표본 시드 — 격자 라벨·중심 좌표는 MOCK_CELLS와 동기화하고,
 * 수집 시각(collectedAt)·수집 영상 수(videoCount)만 여기서 부여한다.
 * videoCount는 격자 전체 영상 수가 아니라 "이 사용자가 그 격자에서 수집한 수"라 별도 값이다.
 */
const COLLECTED_SEEDS: { cellId: string; ago: number; videoCount: number }[] = [
  { cellId: "A-14", ago: 2 * HOUR, videoCount: 2 },
  { cellId: "B-08", ago: 5 * HOUR, videoCount: 3 },
  { cellId: "B-07", ago: 1 * DAY, videoCount: 1 },
  { cellId: "C-02", ago: 3 * DAY, videoCount: 4 },
  { cellId: "A-15", ago: 6 * DAY, videoCount: 1 },
  { cellId: "G-03", ago: 12 * DAY, videoCount: 2 },
];

const cellById = (id: string) => {
  const cell = MOCK_CELLS.find((c) => c.id === id);
  if (!cell) throw new Error(`MOCK_CELLS에 없는 격자 id: ${id}`);
  return cell;
};

const MOCK_COLLECTED_CELLS: CollectedCell[] = COLLECTED_SEEDS.map(
  ({ cellId, ago, videoCount }) => {
    const { label, center } = cellById(cellId);
    return { cellId, label, center, collectedAt: isoAgo(ago), videoCount };
  },
);

/**
 * 지역(구)별 탐험률 mock 맵 (개정 D2, A5 개정) — 키는 MOCK_REGIONS(entities/region) 8개 구
 * + 디폴트 지역 "중구"(A13, 서울시청 소재지). 값은 백엔드 소관 가정의 임시 목값.
 * 맵에 없는 지역은 조회 측(current-region)이 0%로 처리한다 (AC 21).
 */
const MOCK_REGION_EXPLORED_PCT: Record<string, number> = {
  마포구: 52,
  강남구: 18,
  성동구: 34,
  용산구: 27,
  영등포구: 12,
  송파구: 8,
  관악구: 5,
  종로구: 41,
  중구: 22,
};

/**
 * 개인 도감 mock 데이터 (MSG-121, 2026-07-22 개정 반영).
 * Figma의 닉네임·68%·148개·12개·23일 등은 전부 플레이스홀더(티켓 [참고] 명시) —
 * 여기 값이 화면의 유일한 출처다. 실 API 전환 시 use-dex-query의 queryFn 내부만 교체한다.
 * totalExploredPct는 전체 지도 기준 미소값 0.012 (개정 D1, A12 — "전체 지도 0.012% 탐험").
 * collectedCellCount는 수집 목록 길이와 일치시켜 mock의 자기모순을 피한다.
 * 수집 목록은 6건 — 최근 목록 상한 30(개정 D3)은 mock으로 발동하지 않으며 vitest가 판정한다(AC 14).
 */
export const MOCK_DEX: DexData = {
  summary: {
    nickname: "필맵퍼",
    totalExploredPct: 0.012,
    streakDays: 12,
    collectedCellCount: MOCK_COLLECTED_CELLS.length,
    badgeCount: 4,
  },
  collectedCells: MOCK_COLLECTED_CELLS,
  regionExploredPctMap: MOCK_REGION_EXPLORED_PCT,
};
