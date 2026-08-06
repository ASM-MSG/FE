import { MOCK_CELLS } from "@/entities/cell";
import type {
  CollectionGridResponseDto,
  CollectionSummaryResponseDto,
  MyBadgeResponseDto,
  RegionVideoResponseDto,
} from "@/shared/api/generated/types.gen";
import type { CollectedCell, CollectedVideo, DexBadge, DexData } from "./dex";

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
const COLLECTED_SEEDS: { gridId: string; ago: number; videoCount: number }[] = [
  { gridId: "A-14", ago: 2 * HOUR, videoCount: 4 },
  { gridId: "B-08", ago: 5 * HOUR, videoCount: 5 },
  { gridId: "B-07", ago: 1 * DAY, videoCount: 1 },
  { gridId: "C-02", ago: 3 * DAY, videoCount: 4 },
  { gridId: "A-15", ago: 6 * DAY, videoCount: 1 },
  { gridId: "G-03", ago: 12 * DAY, videoCount: 2 },
];

const cellById = (id: string) => {
  const cell = MOCK_CELLS.find((c) => c.id === id);
  if (!cell) throw new Error(`MOCK_CELLS에 없는 격자 id: ${id}`);
  return cell;
};

/**
 * 명세 대응 필드(gridId·firstCollectedAt·videoCount)는 satisfies로
 * CollectionGridResponseDto에 연결한다 (MSG-289 AC 4). gridId 값은 mock 체계 "A-14" 유지
 * (명세 "{gridY}_{gridX}" 체계 전환은 후속 — 질문 5 승인). label·district·center는 FE 확장.
 * 명세 갱신(2026-08-06)으로 필수가 된 gridX·gridY·lastUploadedAt은 화면 미소비라
 * Pick으로 대응 필드만 한정한다 — 소비하는 티켓에서 도메인 타입과 함께 추가한다.
 */
const MOCK_COLLECTED_CELLS: CollectedCell[] = COLLECTED_SEEDS.map(
  ({ gridId, ago, videoCount }) => {
    const { label, center, district } = cellById(gridId);
    return {
      ...({
        gridId,
        firstCollectedAt: isoAgo(ago),
        videoCount,
      } satisfies Pick<
        CollectionGridResponseDto,
        "gridId" | "firstCollectedAt" | "videoCount"
      >),
      label,
      district,
      center,
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
 * 격자당 videoCount개 생성, 첫 영상(i=0)의 createdAt은 격자 firstCollectedAt과 동일
 * ("첫 영상 수집 = 격자 수집", A9 — 갤러리 최신순과 최근 수집 목록 순서가 모순되지 않는다).
 * 격자당 3번째 영상(i=2)은 thumbnailUrl 미제공 — placeholder 타일 경로 검증용 (A7·AC 10).
 * videoId는 소속 Cell.videos(CellVideo.videoId)에서 직접 가져온다(② B3) — "수집 영상 =
 * 그 격자 영상의 일부"의 mock 표현으로, 썸네일 클릭 → 상세 시트 활성 매칭 키가 된다.
 * 전 수집 격자에서 videoCount ≤ sampleSize라 항상 매칭 가능하다 (AC 6 불변식, mock-dex.test).
 * 명세 대응 필드는 satisfies로 RegionVideoResponseDto에 연결한다 (MSG-289 AC 4) — cellLabel만 FE 확장.
 * 명세 갱신(2026-08-06)으로 필수가 된 durationSec·processingStatus는 화면 미소비라 Pick으로 한정.
 */
export const MOCK_COLLECTED_VIDEOS: CollectedVideo[] =
  MOCK_COLLECTED_CELLS.flatMap((cell) => {
    const cellVideos = cellById(cell.gridId).videos;
    return Array.from(
      { length: cell.videoCount },
      (_, i): CollectedVideo => ({
        ...({
          videoId: cellVideos[i].videoId,
          gridId: cell.gridId,
          thumbnailUrl: i === 2 ? null : svgThumbnail(cell.label, i + 1),
          createdAt: new Date(
            Date.parse(cell.firstCollectedAt) + i * VIDEO_GAP,
          ).toISOString(),
        } satisfies Pick<
          RegionVideoResponseDto,
          "videoId" | "gridId" | "thumbnailUrl" | "createdAt"
        >),
        cellLabel: cell.label,
      }),
    );
  });

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
 * 뱃지 카탈로그 mock 12개 (MSG-123 A6) — Figma 이름 6개("서울 정복"→"부산 정복" 치환, AC 12
 * MVP 부산 서면 규칙) + 신규 6개(부산·서면 테마 — mock 전용, 실 카탈로그 확정 시 교체).
 * 정의 순서 = 표시 순서(A2 — 획득 여부로 재정렬하지 않음, Figma도 컬러·회색 혼재 배치).
 * 획득 4개는 앞 8개(프리뷰 범위) 안에 배치해 프리뷰만 봐도 통계 카드 "획득 뱃지"와
 * 정합이 눈으로 확인된다 (AC 5). 획득 판정은 백엔드 소관(제외 범위) — earned는 고정값.
 * badgeId는 명세대로 number(정의 순서 1~12 — 기존 슬러그 문자열 id에서 전환, MSG-289 추정 3).
 * satisfies로 MyBadgeResponseDto에 연결한다 (MSG-289 AC 4) — 명세 갱신(2026-08-06)으로
 * 필수가 된 code·isNew는 화면 미소비라 Pick으로 대응 필드만 한정.
 */
export const MOCK_BADGES: DexBadge[] = [
  { badgeId: 1, name: "첫 기록", earned: true },
  { badgeId: 2, name: "첫 업로드", earned: true },
  { badgeId: 3, name: "탐험가", earned: true },
  { badgeId: 4, name: "부산 정복", earned: false },
  { badgeId: 5, name: "열정 기록러", earned: true },
  { badgeId: 6, name: "30일 스트릭", earned: false },
  { badgeId: 7, name: "서면 마스터", earned: false },
  { badgeId: 8, name: "전포 카페거리", earned: false },
  { badgeId: 9, name: "야간 수집가", earned: false },
  { badgeId: 10, name: "골목 탐험가", earned: false },
  { badgeId: 11, name: "광안리 원정", earned: false },
  { badgeId: 12, name: "격자 100칸", earned: false },
] satisfies Pick<MyBadgeResponseDto, "badgeId" | "name" | "earned">[];

/**
 * 개인 도감 mock 데이터 (MSG-121, 2026-07-22 개정 반영).
 * Figma의 닉네임·68%·148개·12개·23일 등은 전부 플레이스홀더(티켓 [참고] 명시) —
 * 여기 값이 화면의 유일한 출처다. 실 API 전환 시 use-dex-query의 queryFn 내부만 교체한다.
 * totalExploredPct는 전체 지도 기준 미소값 0.012 (개정 D1, A12 — "전체 지도 0.012% 탐험").
 * totalGridCount는 수집 목록 길이와, badgeCount는 카탈로그 earned 수와 일치시켜
 * mock의 자기모순을 피한다 (MSG-123 AC 5 — badgeCount는 백엔드 표시값 계약 유지, R3:
 * 파생은 mock 정합 장치일 뿐 프론트 획득 판정 로직이 아니다).
 * 수집 목록은 6건 — 최근 목록 상한 30(개정 D3)은 mock으로 발동하지 않으며 vitest가 판정한다(AC 14).
 * summary는 명세 대응 필드(totalGridCount)만 satisfies로 CollectionSummaryResponseDto에
 * 연결한다 (MSG-289 AC 4 — 대응 필드 한정 Pick, 나머지는 FE 확장. 명세 갱신 2026-08-06으로
 * 필수가 된 totalVideoCount·visitedRegionCount는 화면 미소비 — 소비 티켓에서 추가).
 */
export const MOCK_DEX: DexData = {
  summary: {
    ...({
      totalGridCount: MOCK_COLLECTED_CELLS.length,
    } satisfies Pick<CollectionSummaryResponseDto, "totalGridCount">),
    nickname: "필맵퍼",
    totalExploredPct: 0.012,
    streakDays: 12,
    badgeCount: MOCK_BADGES.filter((b) => b.earned).length,
  },
  collectedCells: MOCK_COLLECTED_CELLS,
  badges: MOCK_BADGES,
  regionExploredPctMap: MOCK_REGION_EXPLORED_PCT,
};
