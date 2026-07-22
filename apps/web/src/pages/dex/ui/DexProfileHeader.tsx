import { Avatar } from "@fillmap/ui-web";

interface DexProfileHeaderProps {
  nickname: string;
  /** 아바타 이미지 URL — 없으면 이니셜 fallback (Figma 그라데이션 원은 플레이스홀더) */
  avatarSrc?: string;
  /** 전체 탐험 라벨 (예: "서울") */
  totalLabel: string;
  /** 0~100 클램프 완료 값 */
  totalExploredPct: number;
  streakDays: number;
  /** [프로필] 클릭 → 프로필 페이지 이동 (콜백 주입 — 네비게이션은 패널 몫) */
  onProfileClick: () => void;
}

/**
 * 도감 패널 상단 프로필 요약 (AC 4·5) — Figma node 13399:1575 상단 블록.
 * 아바타(ui-web Avatar lg=48px) + 닉네임 + "서울 N% 탐험 · N일 연속 기록" + [프로필] pill.
 */
export const DexProfileHeader = ({
  nickname,
  avatarSrc,
  totalLabel,
  totalExploredPct,
  streakDays,
  onProfileClick,
}: DexProfileHeaderProps) => (
  <div className="flex items-center gap-sm">
    <Avatar
      size="lg"
      src={avatarSrc}
      alt={nickname}
      fallback={nickname.slice(0, 1)}
    />
    <div className="flex min-w-0 flex-1 flex-col gap-xxs">
      <p className="truncate text-fm-title text-foreground">{nickname}</p>
      <p className="truncate text-fm-body text-foreground-muted">
        {totalLabel} {totalExploredPct}% 탐험 · {streakDays}일 연속 기록
      </p>
    </div>
    <button
      type="button"
      onClick={onProfileClick}
      className="shrink-0 rounded-full border border-border bg-surface-soft px-3 py-1.5 text-fm-body-strong text-foreground-body"
    >
      프로필
    </button>
  </div>
);
