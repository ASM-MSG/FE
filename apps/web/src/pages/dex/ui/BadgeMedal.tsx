import { cn } from "@fillmap/ui-web";
import { resolveBadgeArt } from "@/entities/badge";
import type { DexBadge } from "@/entities/dex";

interface BadgeMedalProps {
  badge: DexBadge;
}

/**
 * 뱃지 메달 1개 (MSG-327 기준 18~20, Figma 뱃지 시안 node 14599:11390) —
 * 56px 메달 아트 + 하단 라벨. 시안 메달은 148px이고 진열장(4열)에 맞춰 축소한다(사용자 지시).
 * 미획득은 grayscale + 반투명으로 눌러 획득분과 구분하고 이름 대신 "미획득"을 쓴다
 * (MSG-123에서 확립한 규칙 승계 — 미획득 뱃지 이름은 스포일러다).
 * 아트를 못 찾은 code(신규 시드)는 민무늬 원으로 폴백해 화면이 깨지지 않게 한다.
 *
 * 라벨 className에 cn을 쓰지 않는다 — 기본 twMerge가 타이포 토큰(text-fm-caption)을
 * 색상 그룹으로 오분류해 text-foreground(-muted)가 크기 클래스를 밀어낸다 (MSG-108 함정).
 */
export const BadgeMedal = ({ badge }: BadgeMedalProps) => {
  const art = resolveBadgeArt(badge.code, badge.iconUrl);

  return (
    <li className="flex flex-col items-center gap-xxs">
      {art !== null ? (
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
      )}
      <span
        className={`text-center text-fm-caption break-keep ${
          badge.earned ? "text-foreground" : "text-foreground-muted"
        }`}
      >
        {badge.earned ? badge.name : "미획득"}
      </span>
    </li>
  );
};
