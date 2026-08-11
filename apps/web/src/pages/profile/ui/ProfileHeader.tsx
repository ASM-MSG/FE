import { Avatar, Button } from "@fillmap/ui-web";
import { avatarFallback } from "@/entities/profile";

interface ProfileHeaderProps {
  nickname: string;
  /** 가입 이메일 — 카카오 가입은 미수집이라 null (명세 계약). null이면 이메일 줄 자체를 렌더하지 않는다 (A2) */
  email: string | null;
  /** 아바타 이미지 URL — 없으면 이니셜 fallback (Figma 그라데이션 원은 플레이스홀더) */
  avatarSrc?: string;
  /** [편집] 클릭 핸들러 — 프로필 편집 모달 열기 */
  onEdit?: () => void;
}

/**
 * 프로필 헤더 — 아바타(ui-web Avatar lg) + 닉네임 + 이메일 + [편집].
 * [MSG-329 A2·A4] 실 API(GET /api/users/me)는 email·nickname뿐이다 — 구 "가입일 YYYY.MM.DD"
 * 줄은 명세 부재로 렌더하지 않고(조회 노출은 백엔드 환류), email null이면 이메일 줄도
 * 렌더하지 않는다(빈 문자열·"—" 아님).
 */
export const ProfileHeader = ({
  nickname,
  email,
  avatarSrc,
  onEdit,
}: ProfileHeaderProps) => (
  <div className="flex items-center gap-sm">
    <Avatar
      size="lg"
      src={avatarSrc}
      alt={nickname}
      fallback={avatarFallback(nickname)}
    />
    <div className="flex min-w-0 flex-1 flex-col gap-xxs">
      <p className="truncate text-fm-title text-foreground">{nickname}</p>
      {email !== null && (
        <p
          className="truncate text-fm-body text-foreground-muted"
          title={email}
        >
          {email}
        </p>
      )}
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
