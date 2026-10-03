import type { EarnedBadgeResponseDto } from "../../../shared/api/sdk";

/**
 * 뱃지 획득 모달 (MSG-617) — 업로드 확정 응답 `newBadges`를 한 장씩 보여 주는 모달의
 * 순수 모델. 문구와 장(card) 파생만 소유하고 뷰·내비는 모른다.
 *
 * `analysis-copy.ts`에 섞지 않는 이유(D11): 그 파일은 분석·완료 **단계** 문구 묶음이고
 * 이 모달은 응답 파생 모델과 함께 두는 쪽이 응집된다. 웹에 대응 화면이 없어 미러 대상 없음.
 */
export const BADGE_EARNED_COPY = {
  title: "새 뱃지 획득",
  next: "다음",
  confirm: "확인",
} as const;

/** 모달이 지금 보여 주는 한 장 — 닫기 제스처는 장과 무관하게 전체를 닫는다(D10) */
export interface BadgeCard {
  badge: EarnedBadgeResponseDto;
  index: number;
  total: number;
  isLast: boolean;
  /** 주 버튼 1개의 라벨 — 마지막 장만 [확인], 그 전은 [다음] */
  primaryLabel: string;
}

/** 빈 배열·범위 밖 index → null (모달 미렌더) */
export const describeBadgeCard = (
  badges: readonly EarnedBadgeResponseDto[],
  index: number,
): BadgeCard | null => {
  const badge = badges[index];
  if (badge === undefined) return null;
  const isLast = index === badges.length - 1;
  return {
    badge,
    index,
    total: badges.length,
    isLast,
    primaryLabel: isLast ? BADGE_EARNED_COPY.confirm : BADGE_EARNED_COPY.next,
  };
};

/** 점 인디케이터 컨테이너의 a11y 라벨 (AC 13) */
export const dotsLabel = (index: number, total: number): string =>
  `${total}개 중 ${index + 1}번째 뱃지`;
