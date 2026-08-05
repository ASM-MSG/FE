/**
 * 테마별 격자·내 점령 격자·추천 경로 mock (MSG-298) — 부산 서면 일대만 (서울 지명 금지).
 * 격자명은 mock-grid-videos의 라벨 관례(서면·전포·부전·양정·범천·연산)를 따르고,
 * 셀은 서면 중심 셀 기준 오프셋으로 정의해 전부 기본 뷰포트(서면 중심 줌 16) 안에
 * 놓는다 (확정 2 — 테마 선택 시 카메라 이동 없음). 같은 셀은 테마가 달라도 같은
 * 격자명을 갖는다. 셀 수를 늘리는 확장은 피한다 (스펙 리스크 2 — 빗금 폴리라인 규모).
 */
import {
  cellBoundsAt,
  cellIndexAt,
  type GridCellIndex,
  type LatLng,
} from "../../../entities/cell/model/grid";
import type { ThemeId } from "./themes";

/**
 * 서면 중심 좌표 — shared/geolocation SEOMYEON_CENTER와 동일 값.
 * geolocation.ts는 expo-location을 import하므로 순수 모델에서 직접 참조하지 않는다
 * (RN 경계 규칙 — 로컬 상수 중복이 어댑터 경유보다 싸다).
 */
const SEOMYEON: LatLng = { lat: 35.1579, lng: 129.0594 };

/** 기본 뷰포트 중심 셀 — mock 배치·뷰포트 검증의 기준점 */
export const SEOMYEON_CENTER_CELL: GridCellIndex = cellIndexAt(SEOMYEON);

const cellAt = (dCol: number, dRow: number): GridCellIndex => ({
  col: SEOMYEON_CENTER_CELL.col + dCol,
  row: SEOMYEON_CENTER_CELL.row + dRow,
});

/** 셀 중심 좌표 — 경로 waypoint 배치용 */
const cellCenter = (index: GridCellIndex): LatLng => {
  const { sw, ne } = cellBoundsAt(index);
  return { lat: (sw.lat + ne.lat) / 2, lng: (sw.lng + ne.lng) / 2 };
};

/**
 * 상대시간 표기용 mock 시각 — 모듈 로드 시점 기준 N시간 전.
 * 고정 ISO면 검증 시점에 따라 "N시간 전"이 "M월 D일"로 드리프트해 AC 15의
 * 상대시간 케이스를 화면에서 확인할 수 없다 (표시용 mock 한정 허용 — 테스트는
 * 포맷 함수에 now를 주입해 결정적).
 */
const hoursAgo = (hours: number): string =>
  new Date(Date.now() - hours * 3_600_000).toISOString();

export interface ThemeRepVideo {
  /** 길이 배지 m:ss 표기용 (shared/format.formatDuration) */
  durationSec: number;
  /** 내 영상 여부 — 업로더 표기 규칙(AC 14) */
  isMine: boolean;
  /** 타인 영상의 @핸들 (isMine=false일 때만) */
  uploaderHandle?: string;
  /** 업로드 시각 ISO — 시점 표기(AC 15) */
  uploadedAt: string;
  /** 조회수 — 조회수 표기(AC 15) */
  viewCount: number;
}

export interface ThemeGridEntry {
  cell: GridCellIndex;
  /** 격자명 — 서면 일대 라벨 관례 */
  label: string;
  /** 격자에 쌓인 영상 수 — 섹션 "· N개" */
  videoCount: number;
  /** 대표 영상 1개 (썸네일은 mock 무이미지 → Thumbnail 폴백, Figma 오탐 방지 5) */
  video: ThemeRepVideo;
}

/** 내 점령 격자 (확정 8 — 기본 상태에서도 primary 채움 상시 표시) */
export const MOCK_OCCUPIED_CELLS: GridCellIndex[] = [
  cellAt(0, 1), // 서면 A-14 — 핫구역·팝업스토어·경로추천 교집합
  cellAt(2, 2), // 양정 B-08 — 지역축제 교집합
  cellAt(1, 0),
  cellAt(0, 3),
  cellAt(-1, 0),
];

export const MOCK_THEME_GRIDS: Record<ThemeId, ThemeGridEntry[]> = {
  hot: [
    {
      cell: cellAt(0, 1),
      label: "서면 A-14",
      videoCount: 5,
      video: {
        durationSec: 42,
        isMine: true,
        uploadedAt: "2026-07-31T12:00:00+09:00",
        viewCount: 214,
      },
    },
    {
      cell: cellAt(1, 2),
      label: "전포 A-15",
      videoCount: 4,
      video: {
        durationSec: 17,
        isMine: false,
        uploaderHandle: "jeonpo_walk",
        uploadedAt: hoursAgo(2),
        viewCount: 24_000,
      },
    },
    {
      cell: cellAt(-1, 3),
      label: "부전 B-07",
      videoCount: 3,
      video: {
        durationSec: 26,
        isMine: false,
        uploaderHandle: "bujeon_daily",
        uploadedAt: "2026-08-01T09:30:00+09:00",
        viewCount: 8_600,
      },
    },
  ],
  festival: [
    {
      cell: cellAt(2, 2),
      label: "양정 B-08",
      videoCount: 6,
      video: {
        durationSec: 31,
        isMine: true,
        uploadedAt: hoursAgo(5),
        viewCount: 1_240,
      },
    },
    {
      cell: cellAt(2, 0),
      label: "연산 H-11",
      videoCount: 2,
      video: {
        durationSec: 12,
        isMine: false,
        uploaderHandle: "yeonsan_pick",
        uploadedAt: "2026-07-28T18:45:00+09:00",
        viewCount: 15_000,
      },
    },
  ],
  popup: [
    {
      cell: cellAt(0, 1),
      label: "서면 A-14",
      videoCount: 4,
      video: {
        durationSec: 22,
        isMine: false,
        uploaderHandle: "seomyeon_eats",
        uploadedAt: hoursAgo(12),
        viewCount: 3_800,
      },
    },
    {
      cell: cellAt(-2, 2),
      label: "범천 I-01",
      videoCount: 3,
      video: {
        durationSec: 48,
        isMine: true,
        uploadedAt: "2026-08-02T21:10:00+09:00",
        viewCount: 620,
      },
    },
  ],
  route: [
    {
      cell: cellAt(0, 1),
      label: "서면 A-14",
      videoCount: 5,
      video: {
        durationSec: 42,
        isMine: true,
        uploadedAt: "2026-07-31T12:00:00+09:00",
        viewCount: 214,
      },
    },
    {
      cell: cellAt(-2, 2),
      label: "범천 I-01",
      videoCount: 3,
      video: {
        durationSec: 19,
        isMine: false,
        uploaderHandle: "beomcheon_run",
        uploadedAt: hoursAgo(20),
        viewCount: 10_000,
      },
    },
    {
      cell: cellAt(1, 2),
      label: "전포 A-15",
      videoCount: 4,
      video: {
        durationSec: 35,
        isMine: false,
        uploaderHandle: "jeonpo_walk",
        uploadedAt: "2026-07-25T15:20:00+09:00",
        viewCount: 46_500,
      },
    },
  ],
};

/**
 * 추천 경로 mock — 경로추천 테마 격자 3곳의 셀 중심을 방문 순서대로 연결한다.
 * 배열 순서 = 방문 순서 = 웨이포인트 번호 순서 (AC 10). 직선 연결 근사면 충분
 * (Figma 오탐 방지 6 — 실경로 계산은 제외 범위).
 */
export const MOCK_ROUTE_PATH: LatLng[] = [
  cellCenter(cellAt(0, 1)), // 1: 서면 A-14
  cellCenter(cellAt(-2, 2)), // 2: 범천 I-01
  cellCenter(cellAt(1, 2)), // 3: 전포 A-15
];

export interface RouteWaypoint {
  /** 1부터 시작하는 방문 순번 — 번호 마커 표기 */
  seq: number;
  coord: LatLng;
}

/** 경로 좌표 배열 → 번호 웨이포인트 (AC 10 — 순번은 배열 순서와 일치) */
export const buildRouteWaypoints = (path: LatLng[]): RouteWaypoint[] =>
  path.map((coord, i) => ({ seq: i + 1, coord }));
