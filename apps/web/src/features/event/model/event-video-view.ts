import { ApiError } from "@/shared/api/api-error";
import type {
  EventVideoCommentPageResponseDto,
  EventVideoCommentResponseDto,
} from "@/shared/api/generated/types.gen";
import { formatRelativeTime } from "@/shared/format";

/**
 * 행사 영상 미니 패널 표시 파생 (MSG-520 AC 4·7·8·9·13) — 순수 함수.
 * 플랫폼 API(window·router·지도 SDK)를 참조하지 않는다 — RN 재사용 대상.
 */

/**
 * 패널 제목 폴백 (AC 4) — zone 라벨("광안리 H-6") > 행정동명 > 위치명 > "영상".
 * zoneName/zoneCell은 서버 명세상 항상 쌍(구역 밖이면 함께 null — grid-label 관례).
 */
export const eventVideoTitle = (detail: {
  zoneName: string | null;
  zoneCell: string | null;
  regionName: string | null;
  locationName: string;
}): string => {
  if (detail.zoneName !== null) return `${detail.zoneName} ${detail.zoneCell}`;
  if (detail.regionName !== null) return detail.regionName;
  return detail.locationName.trim() === "" ? "영상" : detail.locationName;
};

/** 메타 한 줄 "@닉네임 · 상대시간" (AC 4) — 시각은 업로드 시각(createdAt, 카드와 동일) */
export const eventVideoMetaLine = (
  uploaderNickname: string,
  createdAtIso: string,
  now?: Date,
): string => `@${uploaderNickname} · ${formatRelativeTime(createdAtIso, now)}`;

/** 서버 계약: 댓글 본문 1~500자 (AC 8) */
const COMMENT_MAX_LENGTH = 500;

/** 전송 본문 — trim한 값을 보낸다 (AC 8) */
export const trimmedCommentContent = (raw: string): string => raw.trim();

/** 댓글 전송 가능 판정 (AC 8) — trim 후 1~500자. 빈 입력·공백뿐은 전송 불가 */
export const canSubmitComment = (raw: string): boolean => {
  const length = trimmedCommentContent(raw).length;
  return length >= 1 && length <= COMMENT_MAX_LENGTH;
};

/**
 * 댓글 페이지 병합 (AC 7) — 첫 페이지(상세 내장) 뒤에 추가 페이지를 순서대로 잇는다.
 * 중복 commentId는 첫 등장만 남긴다 — 작성 seed(useCreateComment)로 첫 페이지에
 * 붙은 댓글이 이후 "더 보기" 페이지에 다시 실려 와도 두 번 그리지 않는다.
 */
export const mergeCommentPages = (
  firstPage: EventVideoCommentPageResponseDto | undefined,
  extraPages: EventVideoCommentPageResponseDto[],
): EventVideoCommentResponseDto[] => {
  if (firstPage === undefined) return [];
  const seen = new Set<number>();
  const merged: EventVideoCommentResponseDto[] = [];
  for (const page of [firstPage, ...extraPages]) {
    for (const item of page.comments) {
      if (seen.has(item.commentId)) continue;
      seen.add(item.commentId);
      merged.push(item);
    }
  }
  return merged;
};

/**
 * 다음 댓글 페이지 커서 (AC 7) — 마지막 수신 페이지 기준. null이면 더 없음
 * ("더 보기" 미노출). 불투명 커서 — 해석 금지 (explore-regions 선례).
 */
export const nextCommentsCursor = (
  firstPage: EventVideoCommentPageResponseDto | undefined,
  extraPages: EventVideoCommentPageResponseDto[],
): string | null => {
  const last = extraPages.at(-1) ?? firstPage;
  if (last === undefined || !last.hasNext) return null;
  return last.nextCursor;
};

/**
 * 도움돼요·댓글 실패 → 사용자 언어 안내 (AC 9) — 서버 에러 계약:
 * 아카이브 행사(종료+30일)는 409+13422, 비노출 영상은 404+13406.
 */
export const eventInteractionErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) {
    if (error.developCode === 13422) {
      return "종료된 행사라 더 이상 참여할 수 없어요";
    }
    if (error.developCode === 13406) {
      return "더 이상 볼 수 없는 영상이에요";
    }
  }
  return "요청에 실패했어요. 잠시 후 다시 시도해 주세요.";
};

/** 재생 속도 옵션 (AC 13, 2026-08-31 사용자 결정) — 브라우저 video.playbackRate 값 */
export const PLAYBACK_RATE_OPTIONS = [0.5, 1, 1.25, 1.5, 2] as const;

export type PlaybackRate = (typeof PLAYBACK_RATE_OPTIONS)[number];

/** 속도 메뉴 라벨 (AC 13) — "0.5x"·"1x"·"1.25x"… */
export const playbackRateLabel = (rate: number): string => `${rate}x`;
