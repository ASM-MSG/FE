import type {
  GridGlobalVideoResponseDto,
  GridVideoResponseDto,
} from "../../../shared/api/sdk";
import { formatRelativeTime, formatViewCount } from "../../../shared/format";

/**
 * "이 격자의 영상" 목록 병합·소유 판정·행 문구 (MSG-431 L13~L15) — 순수 함수.
 * 서버 DTO 2종을 화면 계약(VideoRow 1행) 하나로 정규화한다.
 *
 * - 전역(`GET /api/grids/{gridId}/videos`)은 **공개·READY만** 담기고 `nickname`·`viewCount`를 준다
 * - 내 영상(`GET /api/grids/{gridId}/my-videos`)은 비공개·처리 중도 담기지만 조회수가 없다
 *
 * **소유 판정을 두 목록의 videoId 교집합으로 하는 것이 이 모델의 요점이다** — 시트가
 * `mine`으로 갈라지고(공개 범위·삭제 vs 신고), 닉네임 문자열 비교 같은 추정이 필요 없다.
 *
 * 웹에도 같은 목적의 `features/map-home/model/grid-videos.ts`가 있지만 포팅하지 않았다:
 * 웹 모델은 미니 패널 재생 계약(`FeedVideo`·`videoSrc`·`processingStatus`)에 결합돼 있고
 * 모바일에는 재생 화면이 없다. 공통분은 병합 규칙(내 영상 우선 + videoId 중복 제거)뿐이라
 * 그 규칙만 같은 형태로 옮겼다 — parity 대상이 아닌 이유다.
 */

/** 격자 상세 영상 1행 — `VideoRow` + ⋯ 메뉴가 소비하는 표시 모델 */
export interface GridVideoRow {
  videoId: number;
  thumbnailUrl: string | null;
  durationSec: number;
  /** 표시 시각 — 전역은 recordedAt, 내 영상은 createdAt 근사 */
  recordedAt: string;
  /** 소유 여부 — 시트 분기(공개 범위·삭제 vs 신고)의 근거 */
  mine: boolean;
  /** 행 제목 — 서버에 영상 제목이 없어 소유/작성자로 대신한다 */
  title: string;
  /** 행 보조 — "조회 214 · 3일 전" (조회수 미보유면 상대시간만) */
  meta: string;
}

const fromGlobal = (
  dto: GridGlobalVideoResponseDto,
  now?: Date,
): GridVideoRow => ({
  videoId: dto.videoId,
  thumbnailUrl: dto.thumbnailUrl,
  durationSec: dto.durationSec,
  recordedAt: dto.recordedAt,
  mine: false,
  // @는 FE가 붙인다 — 명세 주석 계약 (웹 toFeedItemFromGlobal과 동일)
  title: `@${dto.nickname}`,
  meta: `조회 ${formatViewCount(dto.viewCount)} · ${formatRelativeTime(dto.recordedAt, now)}`,
});

const fromMine = (dto: GridVideoResponseDto, now?: Date): GridVideoRow => ({
  videoId: dto.videoId,
  thumbnailUrl: dto.thumbnailUrl,
  durationSec: dto.durationSec,
  recordedAt: dto.createdAt,
  mine: true,
  title: "내 영상",
  // my-videos 응답에 조회수가 없다 — 0으로 꾸미지 않고 상대시간만 낸다
  meta: formatRelativeTime(dto.createdAt, now),
});

/**
 * 두 목록을 화면 행으로 병합한다 [L13~L15].
 * 내 영상이 앞(업로드 관례), 전역에서 같은 videoId는 제거한다 — 전역 목록의 내 영상 포함
 * 여부가 명세에 없어 FE 방어이며, 포함되지 않으면 무해한 no-op이다.
 * 내 영상 목록 미도착(undefined)이면 전역 목록만으로 구성한다 — 소유 판정은 도착 후 갱신된다.
 */
export const buildGridVideoRows = (
  globalVideos: GridGlobalVideoResponseDto[],
  myVideos: GridVideoResponseDto[] | undefined,
  now?: Date,
): GridVideoRow[] => {
  const mine = (myVideos ?? []).map((dto) => fromMine(dto, now));
  const mineIds = new Set(mine.map((row) => row.videoId));
  return [
    ...mine,
    ...globalVideos
      .filter((dto) => !mineIds.has(dto.videoId))
      .map((dto) => fromGlobal(dto, now)),
  ];
};

/** 게이트형 쿼리 하나의 화면용 상태 — `shared/api/gated-query-status`의 산출 형태 */
export interface GridVideoQueryStatus {
  isPending: boolean;
  isError: boolean;
  retry: () => void;
}

/**
 * 두 목록 쿼리 상태를 목록 하나의 상태로 합친다 [L13] — 한쪽 실패도 목록 실패다
 * (소유 판정 없이 목록을 보여주면 내 영상에 "신고하기"가 뜬다).
 *
 * **재시도는 양쪽을 모두 부른다** — 웹 정본 `features/map-home/model/use-grid-videos-query`와
 * 같은 계약이다. 실패한 쪽만 골라 부르면 둘 다 실패한 상태에서 한 번 눌러 그것이 성공해도
 * 다른 쪽이 error로 남아 화면이 계속 실패 화면이고, 사용자가 재시도를 한 번 더 눌러야 한다
 * (MSG-431 codex 리뷰 3). 성공한 쿼리를 함께 refetch하는 비용은 첫 페이지 20건 조회 1회다.
 */
export const combineGridVideoStatus = (
  globalStatus: GridVideoQueryStatus,
  mineStatus: GridVideoQueryStatus,
): GridVideoQueryStatus => ({
  isPending: globalStatus.isPending || mineStatus.isPending,
  isError: globalStatus.isError || mineStatus.isError,
  retry: () => {
    globalStatus.retry();
    mineStatus.retry();
  },
});
