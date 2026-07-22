import { Avatar, Button } from "@fillmap/ui-web";

interface ProfileHeaderProps {
  nickname: string;
  email: string;
  /** 표시용 가입일 — formatJoinedDate 결과 "YYYY.MM.DD" (AC 3) */
  joinedDateLabel: string;
  /** 아바타 이미지 URL — 없으면 이니셜 fallback (Figma 그라데이션 원은 플레이스홀더) */
  avatarSrc?: string;
}

/**
 * 프로필 헤더 (AC 2) — Figma node 13399:2106 상단 블록 (DexProfileHeader 선례).
 * 아바타(ui-web Avatar lg=48px) + 닉네임 + "가입일 YYYY.MM.DD · 이메일" + [편집].
 * [편집]은 활성 외관 유지 + 핸들러 미배선(클릭 no-op) — 실동작은 범위 밖 (A5).
 * Figma pill(rounded-full)은 ui-web Button primary sm으로 근사 — 컴포넌트 정본 우선 (A8).
 */
export const ProfileHeader = ({
  nickname,
  email,
  joinedDateLabel,
  avatarSrc,
}: ProfileHeaderProps) => (
  <div className="flex items-center gap-sm">
    <Avatar
      size="lg"
      src={avatarSrc}
      alt={nickname}
      fallback={nickname.slice(0, 1)}
    />
    <div className="flex min-w-0 flex-1 flex-col gap-xxs">
      <p className="truncate text-fm-title text-foreground">{nickname}</p>
      <p
        className="truncate text-fm-body text-foreground-muted"
        title={`가입일 ${joinedDateLabel} · ${email}`}
      >
        가입일 {joinedDateLabel} · {email}
      </p>
    </div>
    <Button text="편집" variant="primary" size="sm" className="shrink-0" />
  </div>
);
