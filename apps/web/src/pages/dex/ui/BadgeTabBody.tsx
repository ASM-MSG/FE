import { useState } from "react";
import { Button } from "@fillmap/ui-web";
import type { DexBadge } from "@/entities/dex";
import {
  BADGE_PREVIEW_LIMIT,
  orderBadges,
} from "@/features/dex/model/badge-showcase";
import { BadgeMedal } from "./BadgeMedal";

interface BadgeTabBodyProps {
  /** 뱃지 카탈로그(획득+미획득 전체) — `GET /api/badges` (기준 17) */
  badges: DexBadge[];
}

/**
 * "뱃지 진열장" 탭 본문 (MSG-123 AC 1~8 → MSG-327 실 API·메달 아트 전환,
 * Figma node 14599:12529) — 제목 + 우상단 "전체 보기" 텍스트 버튼 + 4열 메달 그리드 +
 * 하단 "뱃지 전체 보기" 풀폭 버튼. 기본 프리뷰 8개(4열×2행)이고 확장 시 전체 카탈로그가
 * 인라인으로 펼쳐지며 그리드만 패널 안에서 스크롤된다. 확장 후 링크·버튼은 숨김(접기 없음).
 * 표시 순서는 orderBadges — 대표 뱃지(featuredRank 1·2) → 최근 획득순 → 미획득 (기준 17).
 * 뱃지 개별 클릭 상세·대표 교체·획득 연출은 제외 범위 — 표시 전용이다.
 */
export const BadgeTabBody = ({ badges }: BadgeTabBodyProps) => {
  const [expanded, setExpanded] = useState(false);
  const ordered = orderBadges(badges);
  const shown = expanded ? ordered : ordered.slice(0, BADGE_PREVIEW_LIMIT);
  // 카탈로그가 프리뷰 이하면 확장할 것이 없어 링크·버튼을 애초에 숨긴다
  const showExpand = ordered.length > BADGE_PREVIEW_LIMIT && !expanded;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-sm px-md pb-md">
      <div className="flex items-center justify-between">
        <h2 className="text-fm-title text-foreground">뱃지 진열장</h2>
        {showExpand && (
          <button
            type="button"
            className="text-fm-body text-primary"
            onClick={() => setExpanded(true)}
          >
            전체 보기
          </button>
        )}
      </div>
      <ul className="grid min-h-0 grid-cols-4 content-start gap-x-xs gap-y-md overflow-y-auto scrollbar-gutter-stable">
        {shown.map((badge) => (
          <BadgeMedal key={badge.badgeId} badge={badge} />
        ))}
      </ul>
      {showExpand && (
        <Button
          text="뱃지 전체 보기"
          variant="primary"
          className="w-full shrink-0"
          onClick={() => setExpanded(true)}
        />
      )}
    </div>
  );
};
