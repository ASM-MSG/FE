import { Avatar, Button } from "@fillmap/ui-web";

interface ProfileHeaderProps {
  nickname: string;
  /** 가입 이메일 — 카카오 가입은 미수집이라 null (명세 계약, MSG-322). null이면 세그먼트 생략 */
  email: string | null;
  /** 표시용 가입일 — formatJoinedDate 결과 "YYYY.MM.DD" (AC 3) */
  joinedDateLabel: string;
  /**
   * 아바타 이미지 URL — profileImageUrl ?? 기본 이미지 에셋을 패널이 배선한다 (MSG-378 기준 16,
   * 구 닉네임 첫 글자 fallback 대체. Figma 그라데이션 원·"필" 이니셜은 구 표현 플레이스홀더)
   */
  avatarSrc: string;
  /** [편집] 클릭 핸들러 — 프로필 편집 모달 열기 (MSG-125에서 배선) */
  onEdit?: () => void;
}

/**
 * 프로필 헤더 (AC 2) — Figma node 13399:2106 상단 블록 (DexProfileHeader 선례).
 * 아바타(ui-web Avatar lg=48px) + 닉네임 + "가입일 YYYY.MM.DD · 이메일" + [편집].
 * [편집]은 onEdit로 프로필 편집 모달을 연다 (MSG-124 A5 미배선 → MSG-125 AC 1 배선).
 * Figma pill(rounded-full)은 ui-web Button primary sm으로 근사 — 컴포넌트 정본 우선 (A8).
 */
export const ProfileHeader = ({
  nickname,
  email,
  joinedDateLabel,
  avatarSrc,
  onEdit,
}: ProfileHeaderProps) => {
  // 이메일 null(카카오 가입)이면 "· {email}" 세그먼트 생략 — 가입일만 표시 (MSG-322 추정 1 승인)
  const metaLabel =
    email === null
      ? `가입일 ${joinedDateLabel}`
      : `가입일 ${joinedDateLabel} · ${email}`;

  return (
    <div className="flex items-center gap-sm">
      <Avatar size="lg" src={avatarSrc} alt={nickname} />
      <div className="flex min-w-0 flex-1 flex-col gap-xxs">
        <p className="truncate text-fm-title text-foreground">{nickname}</p>
        <p
          className="truncate text-fm-body text-foreground-muted"
          title={metaLabel}
        >
          {metaLabel}
        </p>
      </div>
      <Button
        text="편집"
        variant="primary"
        size="sm"
        className="shrink-0"
        onClick={onEdit}
      />
    </div>
  );
};
