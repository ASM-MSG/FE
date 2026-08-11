import { useId, useState } from "react";
import {
  Avatar,
  Chip,
  DialogShell,
  Input,
  ModalCard,
  Switch,
} from "@fillmap/ui-web";
import { avatarFallback, type ProfileData } from "@/entities/profile";
import { useUpdateNickname } from "../api/use-profile-mutations";
import {
  canSaveProfile,
  locationStatusLabel,
  nicknameError,
} from "../model/profile-edit";

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 폼 초기값 — 열릴 때마다 이 값으로 복원된다 (AC 8) */
  profile: ProfileData;
}

/**
 * 프로필 편집 모달 (MSG-125 → MSG-329 A7~A9 실 API 배선) — Figma node 13399:2153.
 * DialogShell(스크림·포털·ESC/바깥클릭 닫기·포커스 트랩)로 ModalCard를 감싼다 (ReportDialog 패턴).
 * [저장]은 PUT /api/users/me/nickname — 성공 시 getMe invalidate(훅 소관) 후 모달이 닫히고,
 * 실패 시 모달이 유지되고 오류가 표시되며 재시도가 가능하다 (A8·A9).
 * 닉네임 검증은 2~20자(trim) — 범위 밖이면 [저장] 비활성 + 사유 안내 (A7).
 * 위치정보 토글은 클라이언트 값 유지 — 서버 반영 없음 (A6, 제외 범위).
 */
export const ProfileEditModal = ({
  open,
  onOpenChange,
  profile,
}: ProfileEditModalProps) => {
  const [nickname, setNickname] = useState(profile.nickname);
  const [locationEnabled, setLocationEnabled] = useState(
    profile.locationEnabled,
  );
  const nicknameId = useId();
  const locationId = useId();

  const {
    mutate: saveNickname,
    isPending,
    isError,
    reset,
  } = useUpdateNickname({ onSaved: () => onOpenChange(false) });

  // 닫힐 때 폼·오류 상태를 초기값으로 되돌려 재오픈 시 변경·실패 흔적이 남지 않게 한다 (AC 8)
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (isPending) return; // 저장 진행 중에는 닫지 않는다 — 결과 불명 상태 방지
      setNickname(profile.nickname);
      setLocationEnabled(profile.locationEnabled);
      reset();
    }
    onOpenChange(next);
  };

  const validationMessage = nicknameError(nickname);

  return (
    <DialogShell
      open={open}
      onOpenChange={handleOpenChange}
      srTitle="프로필 편집"
    >
      <ModalCard
        title="프로필 편집"
        cancelText="취소"
        confirmText={isPending ? "저장 중…" : "저장"}
        confirmDisabled={!canSaveProfile(nickname) || isPending}
        onCancel={() => handleOpenChange(false)}
        onConfirm={() => saveNickname(nickname.trim())}
        onClose={() => handleOpenChange(false)}
      >
        {/* 아바타 미리보기 + [변경] — 88px는 variant에 없어 size-22 오버라이드,
            fallback은 닉네임 첫 글자 (ProfileHeader 선례, AC 3) */}
        <div className="flex flex-col items-center gap-md">
          <Avatar
            size="lg"
            alt={profile.nickname}
            fallback={avatarFallback(profile.nickname)}
            className="size-22"
          />
          {/* 순수 프레젠테이셔널 트리거라 토글 시맨틱(aria-pressed)을 제거한다 —
              Chip은 aria-pressed={active}를 항상 렌더하지만 {...props}가 뒤에
              스프레드되므로 undefined 전달로 속성을 미노출 (PR #22 리뷰 반영,
              스모크 테스트로 속성 부재 고정) */}
          <Chip
            text="변경"
            aria-pressed={undefined}
            className="border border-primary bg-transparent text-primary"
          />
        </div>

        <div className="flex flex-col gap-xs">
          <label htmlFor={nicknameId} className="text-fm-label text-foreground">
            닉네임
          </label>
          <Input
            id={nicknameId}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
          {/* 범위 밖 사유 안내 (A7) — 비활성 [저장]의 이유를 시각으로 알린다 */}
          {validationMessage !== null && (
            <p className="text-fm-label text-error">{validationMessage}</p>
          )}
          {/* 저장 실패 — 모달 유지 + 오류 표시 + [저장] 재시도 가능 (A9) */}
          {isError && (
            <p role="alert" className="text-fm-label text-error">
              닉네임 저장에 실패했어요. 다시 시도해주세요
            </p>
          )}
        </div>

        <div className="flex flex-col gap-xs">
          <label htmlFor={locationId} className="text-fm-label text-foreground">
            위치정보 사용
          </label>
          <div className="flex items-center gap-xs">
            <Switch
              id={locationId}
              checked={locationEnabled}
              onCheckedChange={setLocationEnabled}
            />
            <span className="text-fm-body text-foreground-muted">
              {locationStatusLabel(locationEnabled)}
            </span>
          </div>
        </div>
      </ModalCard>
    </DialogShell>
  );
};
