import { useState } from "react";
import { Button } from "@fillmap/ui-web";
import type { DexBadge } from "@/entities/dex";
import { useReplaceFeaturedBadges } from "@/features/dex/api/use-badge-mutations";
import {
  BADGE_PREVIEW_LIMIT,
  orderBadges,
} from "@/features/dex/model/badge-showcase";
import {
  featuredRankOf,
  initialFeaturedSelection,
  toggleFeatured,
} from "@/features/dex/model/featured-selection";
import { BadgeMedal } from "./BadgeMedal";
import { FeaturedProfilePreview } from "./FeaturedProfilePreview";

interface BadgeTabBodyProps {
  /** 뱃지 카탈로그(획득+미획득 전체) — `GET /api/badges` (기준 17) */
  badges: DexBadge[];
  /** 닉네임 — `GET /api/users/me` (MSG-413 기준 5, 미리보기 카드) */
  nickname: string;
  /** 프로필 이미지 URL — null이면 기본 이미지 (MSG-413 기준 5) */
  profileImageUrl: string | null;
}

/**
 * "뱃지 진열장" 탭 본문 (MSG-123 AC 1~8 → MSG-327 실 API·메달 아트 전환,
 * Figma node 14599:12529) — 제목 + 우상단 텍스트 버튼 + 4열 메달 그리드 +
 * 하단 "뱃지 전체 보기" 풀폭 버튼. 기본 프리뷰 8개(4열×2행)이고 확장 시 전체 카탈로그가
 * 인라인으로 펼쳐지며 그리드만 패널 안에서 스크롤된다. 확장 후 링크·버튼은 숨김(접기 없음).
 * 표시 순서는 orderBadges — 대표 뱃지(featuredRank 1·2) → 최근 획득순 → 미획득 (기준 17).
 *
 * MSG-413 편집모드(Figma node 14783:4202) — 헤더 "대표 뱃지 지정" 텍스트 버튼(추정 A1)으로
 * 진입하는 **컴포넌트 로컬 상태**(URL 무변경, 기준 11). 전체 카탈로그 스크롤(추정 A4) 위에서
 * 획득 뱃지를 최대 2개 토글하고(featured-selection), "대표 뱃지 저장"이 PUT 커밋 + 성공 시
 * 종료, "완료"는 서버 호출 없이 종료(미저장 폐기 = 취소 역할, 추정 A2). 저장 중 정렬은
 * 서버 featuredRank 기준 그대로다 — 선택 중 메달이 튀지 않고, 재정렬은 저장 성공의
 * findMyBadges invalidate가 만든다 (기준 7).
 */
export const BadgeTabBody = ({
  badges,
  nickname,
  profileImageUrl,
}: BadgeTabBodyProps) => {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  /** 편집모드 선택 — badgeId 배열, 순서 = 랭크(1·2) = PUT badgeIds 순서 */
  const [selection, setSelection] = useState<number[]>([]);
  const save = useReplaceFeaturedBadges({ onSaved: () => setEditing(false) });
  const ordered = orderBadges(badges);
  const shown = expanded ? ordered : ordered.slice(0, BADGE_PREVIEW_LIMIT);
  // 카탈로그가 프리뷰 이하면 확장할 것이 없어 링크·버튼을 애초에 숨긴다
  const showExpand = ordered.length > BADGE_PREVIEW_LIMIT && !expanded;

  const enterEdit = () => {
    setSelection(initialFeaturedSelection(badges));
    save.reset(); // 이전 편집의 실패 안내 잔상 제거
    setEditing(true);
  };

  if (editing) {
    const selectedBadges = selection.flatMap((id) => {
      const name = badges.find((badge) => badge.badgeId === id)?.name;
      return name !== undefined ? [{ id, name }] : [];
    });

    return (
      <div className="flex min-h-0 flex-1 flex-col gap-sm px-md pb-md">
        <div className="flex items-center justify-between">
          <h2 className="text-fm-title text-foreground">대표 뱃지 지정</h2>
          {/* 저장 pending 중 비활성 — 이탈 후 재진입한 새 편집 세션을 늦은
              onSaved가 닫는 레이스 차단 (codex 리뷰 반영, LocationConsentScreen
              disabled:opacity-60 선례) */}
          <button
            type="button"
            className="text-fm-body text-primary disabled:opacity-60"
            disabled={save.isPending}
            onClick={() => setEditing(false)}
          >
            완료
          </button>
        </div>
        <p className="text-fm-body text-foreground-muted">
          최대 2개까지 골라 프로필에 노출해요. 다시 누르면 해제됩니다.
        </p>
        {/* pt-1 — 첫 행 선택 링·마크(-top-1)가 스크롤 컨테이너에 잘리지 않게 */}
        <ul className="grid min-h-0 flex-1 grid-cols-4 content-start gap-x-xs gap-y-md overflow-y-auto pt-1 scrollbar-gutter-stable">
          {ordered.map((badge) => (
            <BadgeMedal
              key={badge.badgeId}
              badge={badge}
              editing={{
                rank: featuredRankOf(selection, badge.badgeId),
                onToggle: () =>
                  setSelection((current) => toggleFeatured(current, badge)),
              }}
            />
          ))}
        </ul>
        <FeaturedProfilePreview
          nickname={nickname}
          profileImageUrl={profileImageUrl}
          badges={selectedBadges}
        />
        {save.isError && (
          <p role="alert" className="text-fm-label text-error">
            저장에 실패했어요. 잠시 후 다시 시도해 주세요.
          </p>
        )}
        <Button
          text="대표 뱃지 저장"
          variant="primary"
          className="w-full shrink-0"
          disabled={save.isPending}
          onClick={() => save.mutate(selection)}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-sm px-md pb-md">
      <div className="flex items-center justify-between">
        <h2 className="text-fm-title text-foreground">뱃지 진열장</h2>
        <div className="flex items-center gap-sm">
          <button
            type="button"
            className="text-fm-body text-primary"
            onClick={enterEdit}
          >
            대표 뱃지 지정
          </button>
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
