import { useState } from "react";
import { Button, cn } from "@fillmap/ui-web";
import type { DexBadge } from "@/entities/dex";
import { deriveBadgePreview } from "@/features/dex/model/badges";

interface BadgeTabBodyProps {
  /** 뱃지 카탈로그(획득+미획득 전체, 정의 순서) — 도감 조회 응답에서 전달 (AC 11 게이트 공유) */
  badges: DexBadge[];
}

/**
 * 획득 뱃지 원 색 순환 — 시맨틱 토큰 계열 success·secondary·primary (A4, Figma 정확 hex
 * 대신 토큰 1·2조 우선). 카탈로그 위치 기준이라 프리뷰·확장에서 같은 뱃지는 같은 색이다.
 * 3종 순환이라 획득 4개째부터 색이 겹친다(구분은 라벨 텍스트) — 뱃지별 고유 아이콘/색이
 * 생기면 이 순환을 대체한다 (PR #20 리뷰 관찰).
 */
const EARNED_CIRCLE_CLASSES = [
  "bg-success",
  "bg-secondary",
  "bg-primary",
] as const;

/**
 * "뱃지 진열장" 탭 본문 (MSG-123 AC 1~8) — 제목 + 우상단 "전체 보기" 텍스트 버튼(A7) +
 * 4열 그리드(원형 + 라벨) + 하단 "뱃지 전체 보기" 풀폭 버튼. 기본 프리뷰 8개(4열×2행),
 * 링크·버튼 클릭 시 전체 카탈로그로 인라인 확장되고 그리드만 패널 안에서 스크롤된다 (AC 6).
 * 확장 후 링크·버튼은 모두 숨김 — 접기 UI 없음 (A3). 확장 상태는 로컬 state라 탭 이탈 시
 * 언마운트로 프리뷰 복귀한다 (AC 7, GalleryTabBody expanded 선례).
 * 뱃지 개별 클릭 상세·획득 판정·축하 연출은 제외 범위 — 표시 전용이다.
 */
export const BadgeTabBody = ({ badges }: BadgeTabBodyProps) => {
  const [expanded, setExpanded] = useState(false);
  const preview = deriveBadgePreview(badges);
  const shown = expanded ? badges : preview.badges;
  // 카탈로그가 프리뷰 이하면 확장할 것이 없어 링크·버튼을 애초에 숨긴다 (갤러리 A4 선례)
  const showExpand = preview.hasMore && !expanded;

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
        {shown.map((badge, i) => (
          <BadgeCell key={badge.badgeId} badge={badge} order={i} />
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

interface BadgeCellProps {
  badge: DexBadge;
  /** 카탈로그 내 위치 — 획득 원 색 순환 기준 (프리뷰는 앞 8개 그대로라 확장과 색이 일치) */
  order: number;
}

/**
 * 뱃지 1개 — 민무늬 원(56px=size-14) + 하단 라벨 (AC 4, A4 — 아이콘 아트 없음).
 * 획득: 컬러 원 + 뱃지 이름 / 미획득: 회색(surface·border) 원 + "미획득"(이름 미노출).
 * 원은 장식이라 aria-hidden — 정보는 라벨 텍스트가 전달한다.
 * 라벨 className은 cn을 쓰지 않는다 — 기본 twMerge가 타이포 토큰(text-fm-caption)을
 * 색상 그룹으로 오분류해 text-foreground(-muted)가 크기 클래스를 밀어낸다
 * (MSG-108 발견 함정, 03_verify 결함 수정). 조건부는 색뿐이라 병합 없는 문자열 조합으로
 * 크기·색을 동시 적용한다. 원의 cn은 정적·조건부 간 그룹 겹침이 없어 안전하다.
 */
const BadgeCell = ({ badge, order }: BadgeCellProps) => (
  <li className="flex flex-col items-center gap-xxs">
    <span
      aria-hidden
      className={cn(
        "size-14 shrink-0 rounded-full",
        badge.earned
          ? EARNED_CIRCLE_CLASSES[order % EARNED_CIRCLE_CLASSES.length]
          : "border border-border bg-surface",
      )}
    />
    <span
      className={`text-center text-fm-caption break-keep ${
        badge.earned ? "text-foreground" : "text-foreground-muted"
      }`}
    >
      {badge.earned ? badge.name : "미획득"}
    </span>
  </li>
);
