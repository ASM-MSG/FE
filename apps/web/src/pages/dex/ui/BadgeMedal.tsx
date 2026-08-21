import { cn } from "@fillmap/ui-web";
import { resolveBadgeArt } from "@/entities/badge";
import type { DexBadge } from "@/entities/dex";

interface BadgeMedalProps {
  badge: DexBadge;
  /**
   * 편집모드 선택 표시 (MSG-413 기준 2·3·12) — 지정 시 **획득** 뱃지가 토글 버튼이 된다:
   * 선택 = primary 링 + 우상단 랭크 칩(1·2), 미선택 = 우상단 빈 원형 마크.
   * 미획득 뱃지는 편집모드에서도 표시 전용(버튼 미렌더 = 클릭 no-op, 기준 3).
   * 생략 시 기존 표시 전용 경로 그대로다.
   */
  editing?: {
    /** 선택 랭크(1·2) — 미선택이면 null (featuredRankOf 결과) */
    rank: number | null;
    /** 선택 토글 콜백 */
    onToggle: () => void;
  };
}

/**
 * 뱃지 메달 1개 (MSG-327 기준 18~20, Figma 뱃지 시안 node 14599:11390 ·
 * MSG-413 편집모드 확장 node 14783:4247) —
 * 56px 메달 아트 + 하단 라벨. 시안 메달은 148px이고 진열장(4열)에 맞춰 축소한다(사용자 지시).
 * 미획득은 grayscale + 반투명으로 눌러 획득분과 구분하고 이름 대신 "미획득"을 쓴다
 * (MSG-123에서 확립한 규칙 승계 — 미획득 뱃지 이름은 스포일러다).
 * 아트를 못 찾은 code(신규 시드)는 민무늬 원으로 폴백해 화면이 깨지지 않게 한다.
 *
 * 라벨 className에 cn을 쓰지 않는다 — 기본 twMerge가 타이포 토큰(text-fm-caption)을
 * 색상 그룹으로 오분류해 text-foreground(-muted)가 크기 클래스를 밀어낸다 (MSG-108 함정).
 */
export const BadgeMedal = ({ badge, editing }: BadgeMedalProps) => {
  const art = resolveBadgeArt(badge.code, badge.iconUrl);

  const medal =
    art !== null ? (
      <img
        src={art}
        alt=""
        aria-hidden
        loading="lazy"
        className={cn(
          "size-14 shrink-0",
          !badge.earned && "grayscale-100 opacity-40",
        )}
      />
    ) : (
      <span
        aria-hidden
        className={cn(
          "size-14 shrink-0 rounded-full",
          badge.earned ? "bg-primary" : "border border-border bg-surface",
        )}
      />
    );

  const label = (
    <span
      className={`text-center text-fm-caption break-keep ${
        badge.earned ? "text-foreground" : "text-foreground-muted"
      }`}
    >
      {badge.earned ? badge.name : "미획득"}
    </span>
  );

  // 편집모드의 획득 뱃지 — 토글 버튼 + 선택 표시(링·랭크 칩·빈 마크) [기준 2·3·12]
  if (editing !== undefined && badge.earned) {
    return (
      <li className="flex flex-col items-center">
        <button
          type="button"
          aria-pressed={editing.rank !== null}
          aria-label={
            editing.rank !== null
              ? `${badge.name}, 대표 뱃지 ${editing.rank}순위로 선택됨`
              : badge.name
          }
          onClick={editing.onToggle}
          className="flex flex-col items-center gap-xxs"
        >
          <span className="relative shrink-0">
            {medal}
            {editing.rank !== null ? (
              <>
                {/* primary 링 — 메달보다 4px 크게 (Figma featured-ring 64px) */}
                <span
                  aria-hidden
                  className="absolute -inset-1 rounded-full border-2 border-primary"
                />
                <span
                  aria-hidden
                  className="absolute -top-1 -right-1.5 z-10 flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-fm-caption text-primary-foreground"
                >
                  {editing.rank}
                </span>
              </>
            ) : (
              // 미선택 획득 — 우상단 빈 원형 마크 (Figma select-mark)
              <span
                aria-hidden
                className="absolute -top-1 -right-1.5 z-10 size-5 rounded-full border border-border bg-background"
              />
            )}
          </span>
          {label}
        </button>
      </li>
    );
  }

  return (
    <li className="flex flex-col items-center gap-xxs">
      {medal}
      {label}
    </li>
  );
};
