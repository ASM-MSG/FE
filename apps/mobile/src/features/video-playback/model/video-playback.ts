import { ApiError } from "../../../shared/api/api-error";
import { formatMonthDay, formatRelativeTime } from "../../../shared/format";

/**
 * 재생 순수 로직 (MSG-446 기준 1~5) — 지도 SDK·플랫폼·라우터에 의존하지 않는다.
 *
 * 앞의 둘(`playbackStaleTime`·`playbackUnavailableMessage`)은 웹
 * `apps/web/src/features/map-home/model/video-playback.ts`의 **포팅본**이다 —
 * 동등성은 `video-playback.parity.test.ts`가 웹 원본을 동적 import해 단정한다.
 * 뒤의 셋은 모바일 재생 화면이 새로 필요로 하는 파생이다(웹은 미니 패널 JSX 안에
 * 인라인으로 갖고 있어 옮길 원본이 없다 — 표기 규약만 맞춘다).
 */

/**
 * 안전 마진(초) — presigned URL 만료 직전 캐시 히트로 재생 개시 후 만료되는 경계를 줄인다.
 * expiresInSec가 마진 이하로 매우 짧으면 staleTime 0 → 열 때마다 재조회되지만
 * 재생 자체는 성립하므로 수용한다 (스펙 리스크).
 */
const SAFETY_MARGIN_SEC = 30;

/**
 * `VideoPlaybackResponseDto.expiresInSec` → TanStack Query staleTime(ms).
 * null(playbackUrl 없음 — non-READY·BLINDED)·마진 이하면 0으로 캐시 재사용을 막아
 * 만료된 presigned URL이 캐시에서 재생되지 않게 한다.
 */
export const playbackStaleTime = (expiresInSec: number | null): number => {
  if (expiresInSec === null) return 0;
  return Math.max(0, (expiresInSec - SAFETY_MARGIN_SEC) * 1000);
};

/**
 * 재생 불가 사유 문구 (playbackUrl null 분기) — "처리 중"으로 뭉뚱그리지 않는다:
 * FAILED는 기다려도 재생되지 않고(재업로드 필요), 소유자 BLINDED도 별도 사유다.
 * 서버 계약: READY 아님·BLINDED(소유자)면 playbackUrl null (GetPlayback 명세).
 */
export const playbackUnavailableMessage = (video: {
  processingStatus: string;
  status: string;
}): string => {
  if (video.status === "BLINDED") {
    return "블라인드 처리된 영상이라 재생할 수 없어요";
  }
  if (video.processingStatus === "FAILED") {
    return "영상 처리에 실패했어요. 다시 업로드가 필요해요";
  }
  return "AI가 아직 처리 중인 영상이에요. 처리가 끝나면 재생할 수 있어요";
};

/**
 * 재생 화면 제목 (기준 3) — 서버에 **영상 제목 필드가 없어** 격자 라벨로 대신한다.
 * `zoneName`·`zoneCell`은 명세상 항상 쌍이라 한쪽만 보고 판정한다 (grid-label 관례).
 * 웹 `VideoMiniPanel`의 폴백 사슬과 같다 — 목(title) 우선 항목만 없다(모바일에 목 피드 없음).
 */
export const playbackTitle = (playback: {
  zoneName: string | null;
  zoneCell: string | null;
  regionName: string | null;
}): string => {
  if (playback.zoneName !== null)
    return `${playback.zoneName} ${playback.zoneCell}`;
  return playback.regionName ?? "영상";
};

/**
 * 업로더·업로드 시점 한 줄 (기준 4) — `내 영상 · 8월 11일` / `@닉네임 · 3시간 전`.
 * 표기 규약은 `features/map-home/model/grid-videos`의 `videoOwnerLabel`과 같다 —
 * 카드에서 읽은 문구와 그 카드로 연 재생 화면의 문구가 어긋나지 않게 맞춘 것이다.
 * (그쪽은 이미 `@`가 붙은 목록 필드를 받고, 여기는 재생 응답의 원문 `nickname`이라
 * `@`를 직접 붙인다 — 명세 주석 계약: "@ 등 화면 표기는 FE 가 붙인다".)
 */
export const playbackOwnerLine = (
  playback: { nickname: string; recordedAt: string },
  mine: boolean,
  now?: Date,
): string =>
  mine
    ? `내 영상 · ${formatMonthDay(playback.recordedAt)}`
    : `@${playback.nickname} · ${formatRelativeTime(playback.recordedAt, now)}`;

/** 재생 조회 실패 안내 — 문구와 재시도 노출 여부를 함께 판정한다 (기준 5) */
export interface PlaybackAccessNotice {
  message: string;
  /** 재시도 버튼 노출 여부 — 4xx는 다시 눌러도 같은 결과라 노출하지 않는다 */
  retryable: boolean;
}

/**
 * 재생 조회 실패 사유 → 안내 (기준 5·12). **접근 판정은 서버 몫이다** — 목록이 들고 있던
 * 공개 범위나 라우트 `mine` 파라미터로 재생 가부를 자체 판정하지 않고, 여기서는 서버가
 * 내린 상태 코드를 사용자 문구로 옮기기만 한다.
 *
 * 서버 계약(GetPlayback 명세): 삭제·블라인드(타인)는 404, 비공개(타인)·친구만 공개
 * (비친구)는 403이다. 그래서 403은 "비공개"로 안내한다 — 친구 공개까지 한 문구로 덮는
 * 이유는 비친구에게 친구 목록의 존재를 알리지 않기 위함이다.
 *
 * 재시도 노출은 `shouldRetryQuery`(전역 retry 판정)와 같은 축이다 — 4xx는 자동 재시도도
 * 0회이므로 수동 버튼만 남기면 눌러도 같은 화면으로 돌아온다.
 */
export const playbackAccessNotice = (error: unknown): PlaybackAccessNotice => {
  const status = error instanceof ApiError ? error.status : undefined;

  if (status === 403)
    return {
      message: "비공개로 설정된 영상이라 볼 수 없어요",
      retryable: false,
    };
  if (status === 404)
    return {
      message: "삭제되었거나 볼 수 없는 영상이에요",
      retryable: false,
    };

  return {
    message: "영상을 불러오지 못했어요",
    retryable: status === undefined || status >= 500,
  };
};
