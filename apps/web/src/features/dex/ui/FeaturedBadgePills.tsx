interface FeaturedBadgePillsProps {
  /** 대표 뱃지(id·이름) — 랭크 순(featuredBadgesOf 파생 형). 빈 배열이면 아무것도 렌더하지 않는다 */
  badges: { id: number; name: string }[];
}

/**
 * 대표 뱃지 pill 목록 (ADHOC 프로필·도감 헤더 — MSG-413 FeaturedProfilePreview에서 추출).
 * 세 번째 사용처(프로필·도감 헤더) 도달로 공용화 — primary 테두리·텍스트의 rounded-full
 * 정적 pill(Image #3 정본, ui-web Chip 32px 필터 칩 부적합 판단은 MSG-413 승계).
 * 도메인 데이터(`{id, name}` 뱃지) 소비 + 웹 단독이라 ui-web 승격 대상이 아니다(스펙 A3).
 */
export const FeaturedBadgePills = ({ badges }: FeaturedBadgePillsProps) => {
  if (badges.length === 0) return null;

  return (
    <ul aria-label="대표 뱃지" className="flex flex-wrap gap-1.5">
      {badges.map(({ id, name }) => (
        <li
          key={id}
          className="rounded-full border border-primary bg-background px-2 py-0.75 text-fm-caption text-primary"
        >
          {name}
        </li>
      ))}
    </ul>
  );
};
