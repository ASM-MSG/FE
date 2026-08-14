import { Avatar } from "@fillmap/ui-web";
import { DEFAULT_PROFILE_IMAGE } from "@/entities/profile";

interface DexProfileHeaderProps {
  /** 닉네임 — `GET /api/users/me` (기준 1) */
  nickname: string;
  /** 프로필 이미지 URL — null이면 기본 이미지 (기준 1, ProfilePanel과 동일 폴백) */
  profileImageUrl: string | null;
  /** 탐험 규모 보조 문구 — formatExploreSummary 결과 (기준 2) */
  exploreSummary: string;
  /** [프로필] 클릭 → 프로필 페이지 이동 (콜백 주입 — 네비게이션은 패널 몫) */
  onProfileClick: () => void;
}

/**
 * 도감 패널 상단 프로필 요약 (MSG-327 기준 1·2, Figma node 14599:19430) —
 * 아바타(ui-web Avatar lg=48px) + 닉네임 + 탐험 규모 문구 + [프로필] pill.
 *
 * MSG-327에서 데이터 출처가 mock summary(nickname·totalExploredPct)에서 실 API 둘로 갈렸다:
 * 닉네임·이미지는 `users/me`, 문구 수치는 `collections/summary`다. "전체 지도 N% 탐험"은
 * 대응 명세 값이 없어 있는 값 기반 문구로 교체했다(사용자 확정 2026-08-14) —
 * 진짜 탐험률 축은 백엔드 환류 대상이다.
 */
export const DexProfileHeader = ({
  nickname,
  profileImageUrl,
  exploreSummary,
  onProfileClick,
}: DexProfileHeaderProps) => (
  <div className="flex items-center gap-sm">
    <Avatar
      size="lg"
      src={profileImageUrl ?? DEFAULT_PROFILE_IMAGE}
      alt={nickname}
    />
    <div className="flex min-w-0 flex-1 flex-col gap-xxs">
      <p className="truncate text-fm-title text-foreground">{nickname}</p>
      <p className="truncate text-fm-body text-foreground-muted">
        {exploreSummary}
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
