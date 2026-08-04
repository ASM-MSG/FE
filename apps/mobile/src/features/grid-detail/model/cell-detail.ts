/**
 * 셀 id → 격자 상세 표시 모델 파생 (MSG-296 AC 1·4·5·7·9·10) — 순수 함수.
 * 지도 SDK/플랫폼(라우터)에 의존하지 않는다 — RN 로직 레이어 규칙.
 * 등록 mock 셀은 center 좌표의 격자 인덱스로 대조하고(탭 좌표→cellIndexAt→id 경로와 동일),
 * 미등록 셀은 인덱스 자동 라벨 + 빈 상태로 파생한다 (질문 2-a 승인).
 */
import {
  cellBoundsAt,
  cellIndexAt,
  type GridCellIndex,
  type LatLng,
} from "../../../entities/cell/model/grid";
import { cellIdFor, parseCellId } from "../../../entities/cell/model/cell-id";
import {
  formatDuration,
  formatRelativeTime,
  formatViewCount,
} from "../../../shared/format";
import { MOCK_CELL_DETAILS, type MockCellDetail } from "./mock-cell-details";

export interface CellDetailVideoView {
  id: string;
  title: string;
  /** "조회 {축약} · {상대시간}" (AC 9) */
  meta: string;
}

export interface CellDetailView {
  cellId: string;
  index: GridCellIndex;
  /** 셀 bounds 중점 — 상세 지도 카메라 중심 (AC 2) */
  center: LatLng;
  label: string;
  location: string;
  /** "최근 업로드 {상대시간}" — 영상 없는 격자는 null (AC 5·10) */
  recentUploadText: string | null;
  /** 통계 3종 표시 문자열 (AC 7) */
  stats: { fillRate: string; videoCount: string; viewCount: string };
  /** 대표 영상(목록 첫 영상) 길이 mm:ss — 영상 없으면 null = 미리보기 빈 상태 (AC 4·10) */
  previewDurationLabel: string | null;
  videos: CellDetailVideoView[];
  /** 빈 상태 판정 (AC 10) */
  isEmpty: boolean;
}

/** 등록 mock 셀 인덱스 대조표 — center 좌표의 소속 셀 인덱스 기준 */
const REGISTERED_BY_INDEX = new Map<string, MockCellDetail>(
  MOCK_CELL_DETAILS.map((cell) => [cellIdFor(cellIndexAt(cell.center)), cell]),
);

const boundsCenter = (index: GridCellIndex): LatLng => {
  const { sw, ne } = cellBoundsAt(index);
  return { lat: (sw.lat + ne.lat) / 2, lng: (sw.lng + ne.lng) / 2 };
};

/** 인코딩 셀 id → 상세 표시 모델. 인코딩 형식이 아니면 null. `now` 주입으로 결정적 테스트 */
export const deriveCellDetail = (
  cellId: string,
  now: Date = new Date(),
): CellDetailView | null => {
  const index = parseCellId(cellId);
  if (!index) return null;

  const base = {
    cellId,
    index,
    center: boundsCenter(index),
  };

  const registered = REGISTERED_BY_INDEX.get(cellId);
  if (!registered) {
    // 미등록 셀 — 인덱스 자동 라벨 + 위치 고정 + 빈 상태 (질문 2-a)
    return {
      ...base,
      label: `서면 격자 ${index.col}-${index.row}`,
      location: "부산 부산진구",
      recentUploadText: null,
      stats: { fillRate: "0%", videoCount: "0개", viewCount: "0" },
      previewDurationLabel: null,
      videos: [],
      isEmpty: true,
    };
  }

  const isEmpty = registered.videos.length === 0;
  return {
    ...base,
    label: registered.label,
    location: registered.location,
    recentUploadText: registered.recentUploadedAt
      ? `최근 업로드 ${formatRelativeTime(registered.recentUploadedAt, now)}`
      : null,
    stats: {
      fillRate: `${registered.fillRate}%`,
      videoCount: `${registered.videoCount}개`,
      viewCount: formatViewCount(registered.viewCount),
    },
    previewDurationLabel: isEmpty
      ? null
      : formatDuration(registered.videos[0].durationSec),
    videos: registered.videos.map((video, i) => ({
      id: `${cellId}-v${i + 1}`,
      title: video.title,
      meta: `조회 ${formatViewCount(video.viewCount)} · ${formatRelativeTime(video.recordedAt, now)}`,
    })),
    isEmpty,
  };
};
