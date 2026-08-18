import { Avatar } from "@fillmap/ui-web";
import { DEFAULT_PROFILE_IMAGE } from "@/entities/profile";
import { FeaturedBadgePills } from "@/features/dex/ui/FeaturedBadgePills";

interface FeaturedProfilePreviewProps {
  /** 닉네임 — `GET /api/users/me` (기준 5) */
  nickname: string;
  /** 프로필 이미지 URL — null이면 기본 이미지 (DexProfileHeader와 동일 폴백) */
  profileImageUrl: string | null;
  /** 선택된 뱃지(id·이름) — 랭크 순. 빈 배열이면 칩 없이 닉네임만 (기준 5) */
  badges: { id: number; name: string }[];
}

/**
 * 편집모드 하단 "프로필 미리보기" 카드 (MSG-413 기준 5, Figma node 14790:3577) —
 * 아바타(md=36px) + 닉네임 + 선택 뱃지 이름 칩(랭크 순). 선택 변경 시 부모가 넘기는
 * badgeNames로 즉시 갱신된다. 칩은 시안이 19px 정적 pill이라 ui-web Chip(32px 필터 칩)
 * 부적합 — 세 번째 사용처(프로필·도감 헤더) 도달로 로컬 ul에서 features/dex/ui
 * FeaturedBadgePills로 추출했다(ADHOC — 시각 동일). 카드 배경 #f0f6ff는 primary 5% 틴트와
 * 동치라 `bg-primary/5`로 표현한다(임의 hex 금지 — SegmentRow 선례).
 */
export const FeaturedProfilePreview = ({
  nickname,
  profileImageUrl,
  badges,
}: FeaturedProfilePreviewProps) => (
  <div className="flex shrink-0 flex-col gap-xs">
    <h3 className="text-fm-body-strong text-foreground">프로필 미리보기</h3>
    <div className="flex items-center gap-sm rounded-md bg-primary/5 px-md py-3.5">
      <Avatar
        size="md"
        src={profileImageUrl ?? DEFAULT_PROFILE_IMAGE}
        alt={nickname}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-xxs">
        <p className="truncate text-fm-body-strong text-foreground">
          {nickname}
        </p>
        <FeaturedBadgePills badges={badges} />
      </div>
    </div>
  </div>
);
