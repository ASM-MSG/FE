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
 * 개인 도감 mock 데이터 (MSG-121).
 * Figma의 닉네임·68%·148개·12개·23일 등은 전부 플레이스홀더(티켓 [참고] 명시) —
 * 여기 값이 화면의 유일한 출처다. 실 API 전환 시 use-dex-query의 queryFn 내부만 교체한다.
 * collectedCellCount는 수집 목록 길이와 일치시켜 mock의 자기모순을 피한다.
 */
export const MOCK_DEX: DexData = {
  summary: {
    nickname: "필맵퍼",
    totalLabel: "서울",
    totalExploredPct: 37,
    streakDays: 12,
    collectedCellCount: MOCK_COLLECTED_CELLS.length,
    badgeCount: 4,
    regionName: "마포구",
    regionExploredPct: 52,
  },
  collectedCells: MOCK_COLLECTED_CELLS,
};
