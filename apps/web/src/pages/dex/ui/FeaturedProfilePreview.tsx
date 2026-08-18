import { Avatar } from "@fillmap/ui-web";
import { DEFAULT_PROFILE_IMAGE } from "@/entities/profile";

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
 * 부적합 — 로컬 span으로 구현(스펙 재사용 판단). 카드 배경 #f0f6ff는 primary 5% 틴트와
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
        {badges.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {badges.map(({ id, name }) => (
              <li
                key={id}
                className="rounded-full border border-primary bg-background px-2 py-0.75 text-fm-caption text-primary"
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  </div>
);
