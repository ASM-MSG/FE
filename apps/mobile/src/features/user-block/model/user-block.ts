import {
  resolveListState,
  type ListState,
} from "../../../shared/api/list-state";
import type { BlockedUserResponseDto } from "../../../shared/api/sdk";
import { formatKstDate } from "../../../shared/format";

/**
 * 사용자 차단 순수 모델 (MSG-570 기준 3·13·14·16) — 플랫폼 API·react·라우터 무의존.
 * 확인 다이얼로그 문구, 차단 목록의 4상태 판정·행 표시 파생, 해제 성공 seed 필터를 둔다.
 * 화면(`ui/`)은 이 파생만 읽는 얇은 스위치다 (report-history와 같은 3층 구조).
 */

/** 차단 대상 — 진입점 3곳(격자 상세 행·재생 화면·이벤트 댓글)이 넘기는 최소 정보 */
export interface BlockTarget {
  userId: number;
  nickname: string;
}

/** 확인 다이얼로그 제목 (기준 3) — @는 FE가 붙인다(닉네임 원문 계약) */
export const blockConfirmTitle = (nickname: string): string =>
  `@${nickname} 님을 차단할까요?`;

export const BLOCK_CONFIRM_DESCRIPTION =
  "이 사용자의 영상과 댓글이 더 이상 보이지 않아요. 프로필 > 차단한 사용자에서 해제할 수 있어요";

/** 목록 영역의 배타 상태 (기준 16) */
export type BlockListState = ListState;

/** 실패 > 로딩 > 빈 > 목록 — 판정 규칙은 `shared/api/list-state`(report-history와 공유) */
export const resolveBlockListState = resolveListState;

/** 행 1개가 그리는 재료 (기준 13) */
export interface BlockedUserRowView {
  nickname: string;
  /** 아바타 이니셜 폴백 — 닉네임 첫 글자 */
  initial: string;
  /** 없으면 undefined — `Avatar`가 이니셜 폴백을 그린다 */
  avatarUrl: string | undefined;
  /** 차단일 "YYYY.MM.DD"(KST) — 서버 blockedAt은 타임존 마커 없는 UTC */
  blockedAt: string;
}

export const toBlockedUserRowView = (
  dto: BlockedUserResponseDto,
): BlockedUserRowView => ({
  nickname: dto.nickname,
  initial: dto.nickname.slice(0, 1),
  avatarUrl: dto.profileImageUrl ?? undefined,
  blockedAt: formatKstDate(dto.blockedAt),
});

/** 해제 성공 seed (기준 14) — 서버 순서를 유지한 채 그 행만 뺀다 */
export const removeBlockedUser = (
  list: readonly BlockedUserResponseDto[],
  userId: number,
): BlockedUserResponseDto[] => list.filter((user) => user.userId !== userId);
