import { useId, useState } from "react";
import { Dialog } from "radix-ui";
import { Avatar, Chip, Input, ModalCard, Switch } from "@fillmap/ui-web";
import { avatarFallback, type ProfileData } from "@/entities/profile";
import { canSaveProfile, locationStatusLabel } from "../model/profile-edit";

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 폼 초기값 — 열릴 때마다 이 값으로 복원된다 (AC 8) */
  profile: ProfileData;
}

/**
 * 프로필 편집 모달 (MSG-125) — Figma node 13399:2153.
 * Radix Dialog(스크림·포털·ESC/바깥클릭 닫기·포커스 트랩)로 ModalCard를 감싼다 (ReportDialog 패턴).
 * 폼 상태(닉네임·위치정보 토글)는 로컬 state이며 닫힐 때 초기값으로 복원된다(ReportDialog S9 선례 → AC 8).
 * 저장은 닫힘만 — 저장 처리(API·클라이언트 상태 반영)는 제외 범위 (A4).
 * [변경] 칩은 활성 외관 + 핸들러 미배선(클릭 no-op) — 업로드는 제외 범위 (AC 11).
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

  // 닫힐 때 폼을 초기값으로 되돌려 재오픈 시 변경이 반영되지 않게 한다 (AC 8)
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setNickname(profile.nickname);
      setLocationEnabled(profile.locationEnabled);
    }
    onOpenChange(next);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy-900/40" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-120 -translate-x-1/2 -translate-y-1/2 outline-none"
        >
          <Dialog.Title className="sr-only">프로필 편집</Dialog.Title>
          <ModalCard
            title="프로필 편집"
            cancelText="취소"
            confirmText="저장"
            confirmDisabled={!canSaveProfile(nickname)}
            onCancel={() => handleOpenChange(false)}
            onConfirm={() => handleOpenChange(false)}
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
              <label
                htmlFor={nicknameId}
                className="text-fm-label text-foreground"
              >
                닉네임
              </label>
              <Input
                id={nicknameId}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-xs">
              <label
                htmlFor={locationId}
                className="text-fm-label text-foreground"
              >
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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
