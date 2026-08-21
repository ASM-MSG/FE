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
  /** 대표 영상(목록 첫 영상) 길이 mm:ss — 표본 없으면 null = 미리보기 빈 상태 (AC 4·10) */
  previewDurationLabel: string | null;
  videos: CellDetailVideoView[];
  /** 빈 상태 판정 (AC 10) — 전체 영상 수 기준(표본 아님, MSG-317 AC 8 재정의) */
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

/**
 * 격자 상세 진입 가능 판정 — 지도 홈 격자 탭 게이트용 (MSG-431 신고 배선 결정 5).
 *
 * MSG-317은 이것을 "mock 등록 셀 + videoCount > 0"으로 판정했다. 격자 상세의 영상 목록이
 * 실 API로 바뀐 지금 그 게이트는 **틀린 답을 준다**: 서버에 영상이 있어도 mock에 없는
 * 격자면 진입이 막혀 타인 영상 신고 경로에 아예 닿을 수 없다. 반대로 영상 보유 여부는
 * 탭 시점에 동기적으로 알 수 없다(서버 조회가 필요하고, 이 함수는 호출부 diff를 0으로
 * 두기 위해 동기 시그니처를 유지한다 — `map-home-screen.tsx` 무수정 원칙).
 *
 * 그래서 게이트를 "인코딩 형식이 맞는 셀인가"로 좁힌다. 영상이 없는 격자는 진입 후
 * 상세 화면의 빈 상태("이 격자에 아직 업로드된 영상이 없어요")가 실데이터로 안내한다 —
 * 판정 주체가 mock에서 서버로 옮겨간 것이고, 이름·시그니처는 그대로다.
 */
export const hasCellVideos = (cellId: string): boolean =>
  parseCellId(cellId) !== null;

/**
 * 인코딩 셀 id → 상세 표시 모델. 인코딩 형식이 아니면 null. `now` 주입으로 결정적 테스트.
 * `excludedVideoIds`(MSG-317 AC 7·8) — 삭제된 영상 id를 제외하고 목록·미리보기 길이
 * 라벨·영상 수 통계를 재파생한다. 영상 id는 원본 인덱스 기준이라 제외 후에도 불변.
 */
export const deriveCellDetail = (
  cellId: string,
  now: Date = new Date(),
  excludedVideoIds?: readonly string[],
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

  // 영상 id는 원본 인덱스로 먼저 부여 — 제외 후에도 잔여 영상 id가 밀리지 않는다 (AC 7)
  const excluded = new Set(excludedVideoIds);
  const remaining = registered.videos
    .map((video, i) => ({ id: `${cellId}-v${i + 1}`, video }))
    .filter(({ id }) => !excluded.has(id));
  const excludedCount = registered.videos.length - remaining.length;

  // 빈 상태 판정은 전체 영상 수 기준 (AC 8 재정의 — 리뷰 반영): videos는 최근
  // 표본이라 표본 소진 ≠ 격자의 영상 소진 — videoCount 통계와 동일 기준으로 정합
  const totalRemaining = registered.videoCount - excludedCount;
  const isEmpty = totalRemaining === 0;
  return {
    ...base,
    label: registered.label,
    location: registered.location,
    recentUploadText: registered.recentUploadedAt
      ? `최근 업로드 ${formatRelativeTime(registered.recentUploadedAt, now)}`
      : null,
    stats: {
      fillRate: `${registered.fillRate}%`,
      // 제외 수만큼 감소 (추정 2 — 담수율·조회는 mock 재산정 근거 없어 유지)
      videoCount: `${totalRemaining}개`,
      viewCount: formatViewCount(registered.viewCount),
    },
    // 미리보기는 표본 기준 — 표본 소진 시 빈 표본(null), isEmpty와 별개 (AC 8 재정의)
    previewDurationLabel:
      remaining.length === 0
        ? null
        : formatDuration(remaining[0].video.durationSec),
    videos: remaining.map(({ id, video }) => ({
      id,
      title: video.title,
      meta: `조회 ${formatViewCount(video.viewCount)} · ${formatRelativeTime(video.recordedAt, now)}`,
    })),
    isEmpty,
  };
};
