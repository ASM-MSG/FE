import { Avatar } from "@fillmap/ui-web";
import { formatExploredPct } from "@/features/dex/model/dex-summary";

interface DexProfileHeaderProps {
  nickname: string;
  /** 아바타 이미지 URL — 없으면 이니셜 fallback (Figma 그라데이션 원은 플레이스홀더) */
  avatarSrc?: string;
  /** 전체 지도 기준 탐험 진행률 — 0~100 클램프 완료 값 (개정 D1, A12) */
  totalExploredPct: number;
  /** [프로필] 클릭 → 프로필 페이지 이동 (콜백 주입 — 네비게이션은 패널 몫) */
  onProfileClick: () => void;
}

/**
 * 도감 패널 상단 프로필 요약 (AC 4 개정 D1·AC 5) — Figma node 13399:1575 상단 블록(개정 전 디자인).
 * 아바타(ui-web Avatar lg=48px) + 닉네임 + "전체 지도 0.012% 탐험"(Fog of World식) + [프로필] pill.
 * 연속 기록 문구는 표시하지 않는다 — "연속 스트릭" 통계 카드와 중복(D1 dedup 결정).
 */
export const DexProfileHeader = ({
  nickname,
  avatarSrc,
  totalExploredPct,
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
        전체 지도 {formatExploredPct(totalExploredPct)} 탐험
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
