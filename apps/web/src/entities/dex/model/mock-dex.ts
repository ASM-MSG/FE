import { MOCK_CELLS } from "@/entities/cell";
import type { CollectedCell, CollectedVideo, DexData } from "./dex";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 상대 시간 표시가 항상 자연스럽게 보이도록 로드 시점 기준 과거 ISO를 만든다 (mock 전용, mock-cells 패턴). */
const isoAgo = (ms: number) => new Date(Date.now() - ms).toISOString();

/**
 * 수집 표본 시드 — 격자 라벨·중심 좌표·행정구(district)는 MOCK_CELLS와 동기화하고,
 * 수집 시각(collectedAt)·수집 영상 수(videoCount)만 여기서 부여한다.
 * videoCount는 격자 전체 영상 수가 아니라 "이 사용자가 그 격자에서 수집한 수"라 별도 값이다.
 * A-14 4·B-08 5는 MSG-122 상향(A6) — 부산진구 합계(11)가 프리뷰 9개 제한을 넘겨
 * "갤러리 전체 보기"를 시연할 수 있게 한다 (AC 6·13, R6).
 */
const COLLECTED_SEEDS: { cellId: string; ago: number; videoCount: number }[] = [
  { cellId: "A-14", ago: 2 * HOUR, videoCount: 4 },
  { cellId: "B-08", ago: 5 * HOUR, videoCount: 5 },
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
    const { label, center, district } = cellById(cellId);
    return {
      cellId,
      label,
      district,
      center,
      collectedAt: isoAgo(ago),
      videoCount,
    };
  },
);

/**
 * mock 썸네일 색상 풀 — UI 스타일이 아니라 "대표 프레임 이미지의 내용물"(데이터)이라
 * 디자인 토큰 대상이 아니다. 회색 일색을 피해 그리드 시연이 구분되게 한다 (A7).
 */
const THUMB_HUES = ["#5b7ff2", "#4fae8f", "#d98a4b", "#a26bd4", "#c95f7d"];

/** SVG 마크업 텍스트 삽입용 XML 이스케이프 (④ AC 28) — `&`를 먼저 치환해 이중 이스케이프를 피한다 */
const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

/**
 * 대표 프레임 mock — 격자 라벨·순번을 담은 SVG data URI (A7).
 * 네트워크 무의존·결정적이라 `img` 렌더 경로를 실제로 태우면서도 시연이 재현 가능하다.
 * 실 API 전환 시 서버 제공 URL로 교체된다 (R1).
 * export는 특수문자 라벨 이스케이프 판정(④ AC 28, mock-dex.test) 전용 최소 노출 —
 * 현행 mock 라벨에는 특수문자가 없어 공개 경로(MOCK_COLLECTED_VIDEOS)로는 판정 불가.
 */
export const svgThumbnail = (label: string, seq: number): string => {
  const fill = THUMB_HUES[(label.length + seq) % THUMB_HUES.length];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">` +
    `<rect width="240" height="240" fill="${fill}"/>` +
    `<text x="120" y="112" fill="#ffffff" font-size="20" font-family="sans-serif" text-anchor="middle">${escapeXml(label)}</text>` +
    `<text x="120" y="144" fill="#ffffff" font-size="16" font-family="sans-serif" text-anchor="middle" opacity="0.8">#${seq}</text>` +
    `</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

/** 같은 격자 내 영상 간 수집 간격 — 첫 영상(격자 수집 시각) 이후 순번대로 벌린다 (A9) */
const VIDEO_GAP = 10 * MINUTE;

/**
 * 격자별 수집 영상 mock (MSG-122) — 정합 불변식(AC 6):
 * 격자당 videoCount개 생성, 첫 영상(i=0)의 collectedAt은 격자 collectedAt과 동일
 * ("첫 영상 수집 = 격자 수집", A9 — 갤러리 최신순과 최근 수집 목록 순서가 모순되지 않는다).
 * 격자당 3번째 영상(i=2)은 thumbnailSrc 미제공 — placeholder 타일 경로 검증용 (A7·AC 10).
 * id는 소속 Cell.videos(CellVideo)의 `-v` 체계와 일치(② B3) — "수집 영상 = 그 격자 영상의
 * 일부"의 mock 표현으로, 썸네일 클릭 → 상세 시트 활성 매칭 키가 된다. 전 수집 격자에서
 * videoCount ≤ sampleSize라 항상 매칭 가능하다 (AC 6 불변식, mock-dex.test).
 */
export const MOCK_COLLECTED_VIDEOS: CollectedVideo[] =
  MOCK_COLLECTED_CELLS.flatMap((cell) =>
    Array.from({ length: cell.videoCount }, (_, i): CollectedVideo => ({
      id: `${cell.cellId}-v${i + 1}`,
      cellId: cell.cellId,
      cellLabel: cell.label,
      collectedAt: new Date(
        Date.parse(cell.collectedAt) + i * VIDEO_GAP,
      ).toISOString(),
      ...(i === 2 ? {} : { thumbnailSrc: svgThumbnail(cell.label, i + 1) }),
    })),
  );

/**
 * 지역(구)별 탐험률 mock 맵 (개정 D2, A5 개정) — 키는 MOCK_REGIONS(entities/region) 8개 구.
 * 디폴트 지역 "부산진구"(A13, 서면 소재지)가 REGIONS에 포함되므로 별도 키가 없다
 * (서울 시절의 "중구"는 REGIONS 밖이라 9번째 키였다). 값은 백엔드 소관 가정의 임시 목값.
 * 맵에 없는 지역은 조회 측(current-region)이 0%로 처리한다 (AC 21).
 */
const MOCK_REGION_EXPLORED_PCT: Record<string, number> = {
  부산진구: 52,
  해운대구: 18,
  수영구: 34,
  남구: 27,
  연제구: 12,
  동래구: 8,
  사상구: 5,
  동구: 41,
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
