import { useEffect, useId, useRef, useState } from "react";
import {
  Avatar,
  Chip,
  DialogShell,
  Input,
  ModalCard,
  Switch,
} from "@fillmap/ui-web";
import { DEFAULT_PROFILE_IMAGE, type ProfileData } from "@/entities/profile";
import {
  useRemoveProfileImage,
  useUpdateLocationConsent,
  useUpdateNickname,
} from "../api/use-profile-mutations";
import {
  canSaveProfile,
  locationStatusLabel,
  nicknameError,
} from "../model/profile-edit";
import {
  PROFILE_IMAGE_ACCEPT,
  PROFILE_IMAGE_SIZE_MESSAGE,
  isWithinProfileImageSize,
  profileImageErrorMessage,
} from "../model/profile-image";
import { useProfileImageUpload } from "../model/use-profile-image-upload";

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 폼 초기값 — 열릴 때마다 이 값으로 복원된다 (AC 8) */
  profile: ProfileData;
}

/**
 * 프로필 편집 모달 (MSG-125 → MSG-329 A7~A9 닉네임 실 API + MSG-378 이미지 업로드) —
 * Figma node 13399:2153. DialogShell(스크림·포털·ESC/바깥클릭 닫기·포커스 트랩)로
 * ModalCard를 감싼다 (ReportDialog 패턴).
 *
 * [저장]은 변경분만 순차 배선한다 (MSG-329 ↔ MSG-378 병합 → MSG-407 확장):
 * - 이미지: 선택이 있으면 presign → S3 PUT → 확정(getMe 캐시 병합, 기준 11),
 *   [기본 이미지로] 삭제 예약이면 DELETE /api/users/me/profile-image (MSG-407 기준 18)
 * - 닉네임이 바뀌었으면 PUT /api/users/me/nickname — 성공 시 getMe invalidate(훅 소관) (A8)
 * - 토글이 바뀌었으면 PUT /api/users/me/location-consent (MSG-407 기준 13)
 * - 순서는 이미지(업로드 또는 삭제) → 닉네임 → 위치동의. 모두 성공해야 닫히고, 실패
 *   지점만 오류 표시 + 재시도 가능 (A9·기준 12·20). 성공분은 재요청되지 않는다 —
 *   이미지는 성공 즉시 선택·예약을 폐기하고, 닉네임·토글은 getMe invalidate로 profile
 *   prop이 저장값으로 갱신돼 무변경 판정에 걸린다
 * - 전부 무변경 저장은 기존 동작(닫힘만) — 요청 없음 (기준 14·19)
 * 닉네임 검증은 2~20자(trim) — 범위 밖이면 [저장] 비활성 + 사유 안내 (A7).
 * 라벨 "위치정보 사용"·상태 문구(locationStatusLabel)는 기존 유지 (MSG-407 추정 6).
 *
 * [MSG-378] [변경] 칩 = 이미지 업로드 배선:
 * - 칩 클릭 → 숨김 file input(accept: jpeg·png·webp — heic 제외) 열기 (기준 8)
 * - 파일 선택 → objectURL 로컬 미리보기 (기준 9), 5MB 초과는 요청 없이 즉시 안내 (기준 10)
 * - 진행 중 저장 비활성 (기준 13), 닫힐 때 선택 상태·objectURL 폐기(revoke) →
 *   재오픈 시 원래 이미지 복원 (기준 15)
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
  // 선택 파일은 핸들러에서만 읽혀 ref로 둔다(렌더 미사용 — react-doctor 환류).
  // objectURL 미리보기는 렌더 소비라 state (기준 9) — 닫힐 때 revoke·폐기 (기준 15)
  const selectedFileRef = useRef<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // [기본 이미지로] 삭제 예약 (MSG-407 기준 17) — 서버 반영은 [저장] 시점 (추정 3)
  const [removalReserved, setRemovalReserved] = useState(false);
  // 5MB 사전 검증 안내 (기준 10) — 서버 거부 문구는 upload.error에서 파생 (기준 12)
  const [sizeError, setSizeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nicknameId = useId();
  const locationId = useId();

  // objectURL 폐기는 이 cleanup이 소유한다 — 재선택(의존 변경)·닫기(선택 해제)·
  // 언마운트(라우트 이탈 등) 세 경로 모두 여기서 revoke된다 (기준 15).
  // 미리보기는 마운트 이후 파일 선택으로만 생기므로 StrictMode 이중 마운트
  // (초기 previewUrl=null에서 cleanup 재실행)에도 표시 중인 URL이 무효화되지 않는다.
  useEffect(() => {
    if (previewUrl === null) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const upload = useProfileImageUpload();
  // onSaved는 훅 레벨 onSuccess 경유라 isPending이 아직 true인 시점에 불린다(TanStack v5
  // 콜백 순서) — handleOpenChange의 진행 중 가드를 우회해 prop을 직접 닫는다 (MSG-329 관례).
  // 폼 상태 복원은 불필요: 닉네임은 저장값 그대로고 이미지 선택은 업로드 성공 시 이미 폐기됨
  const {
    mutate: saveNickname,
    isPending: isSavingNickname,
    isError: isNicknameError,
    reset: resetNickname,
  } = useUpdateNickname({ onSaved: () => finishWithConsent(true) });
  // 이미지 삭제 (MSG-407 기준 18) — 다음 단계 진행은 per-call onSuccess로 잇는다
  // (모달이 저장 중 마운트 유지 — useProfileImageUpload 선례)
  const {
    mutate: removeImage,
    isPending: isRemovingImage,
    isError: isRemoveError,
    reset: resetRemove,
  } = useRemoveProfileImage();
  // 위치동의 저장 (MSG-407 기준 13) — 순차 마지막 단계라 onSaved가 곧 닫기
  const {
    mutate: saveConsent,
    isPending: isSavingConsent,
    isError: isConsentError,
    reset: resetConsent,
  } = useUpdateLocationConsent({ onSaved: () => onOpenChange(false) });
  const isSaving =
    upload.isPending || isRemovingImage || isSavingNickname || isSavingConsent;

  const errorMessage =
    sizeError ??
    (upload.error !== null ? profileImageErrorMessage(upload.error) : null) ??
    (isRemoveError ? "이미지 삭제에 실패했어요. 다시 시도해주세요" : null);

  const discardSelection = () => {
    selectedFileRef.current = null;
    setPreviewUrl(null);
    setSizeError(null);
  };

  // 닫힐 때 폼·선택 이미지·삭제 예약·오류 상태를 초기값으로 되돌려 재오픈 시 변경·실패
  // 흔적이 남지 않게 한다 (AC 8, 기준 15·21)
  const handleOpenChange = (next: boolean) => {
    if (!next) {
      if (isSaving) return; // 저장 진행 중에는 닫지 않는다 — 결과 불명 상태 방지
      setNickname(profile.nickname);
      setLocationEnabled(profile.locationEnabled);
      discardSelection();
      setRemovalReserved(false);
      upload.reset(); // 이전 실패 문구가 재오픈 시 남지 않게
      resetNickname();
      resetRemove();
      resetConsent();
    }
    onOpenChange(next);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // 저장 진행 중 재선택 차단 (PR #51 리뷰 반영) — 재선택이 upload.reset()으로 진행 중
    // 뮤테이션의 가드를 풀면, 늦게 완료된 이전 업로드가 새 선택을 캐시에서 덮어쓸 수 있다.
    // disabled 속성(아래 input·Chip)의 프로그램틱 경로 방어
    if (isSaving) return;
    const file = event.target.files?.[0];
    // 같은 파일 재선택도 change가 발화하도록 입력값을 비운다 (취소 후 동일 파일 재선택 경로)
    event.target.value = "";
    if (file === undefined) return;
    if (!isWithinProfileImageSize(file.size)) {
      // 업로드 요청 없이 즉시 안내, 기존 미리보기는 유지 (기준 10)
      setSizeError(PROFILE_IMAGE_SIZE_MESSAGE);
      return;
    }
    selectedFileRef.current = file;
    // 검출기가 setState 경유 데이터 흐름을 추적하지 못하는 오탐: 이 URL은 위
    // previewUrl effect cleanup이 재선택·닫기·언마운트 전 경로에서 revoke하며,
    // 언마운트 revoke는 스모크 테스트("언마운트되면 objectURL이 폐기된다")로 고정됨
    // oxlint-disable-next-line react-doctor/no-create-object-url-without-revoke
    setPreviewUrl(URL.createObjectURL(file));
    // 새 파일 선택은 삭제 예약과 상호 배타 — 예약을 해제한다 (기준 17의 역방향)
    setRemovalReserved(false);
    setSizeError(null);
    upload.reset();
    resetRemove();
  };

  // [기본 이미지로] — 삭제 예약 + 진행 중이던 로컬 파일 선택 폐기 (기준 17).
  // 요청은 [저장] 시점에만 나간다 (추정 3)
  const handleReserveRemoval = () => {
    if (isSaving) return; // 저장 진행 중 재변경 차단 — [변경]과 동일 방어
    discardSelection();
    upload.reset();
    resetRemove();
    setRemovalReserved(true);
  };

  // 순차 마지막 단계 — 토글 무변경이면 요청 없이 닫는다 (기준 14). didRequest=true
  // (앞 단계에서 요청이 나간 경로)는 handleOpenChange의 진행 중 가드를 우회해 prop을
  // 직접 닫고, 전부 무변경 경로는 handleOpenChange로 폼·오류 상태까지 되돌린다
  const finishWithConsent = (didRequest: boolean) => {
    if (locationEnabled !== profile.locationEnabled) {
      saveConsent(locationEnabled);
      return;
    }
    if (didRequest) onOpenChange(false);
    else handleOpenChange(false);
  };

  const handleConfirm = () => {
    const trimmed = nickname.trim();
    // 닉네임 무변경이면 요청 없이 다음 단계(위치동의)로 (기준 14 계열)
    const finishWithNickname = (didRequest: boolean) => {
      if (trimmed !== profile.nickname) saveNickname(trimmed);
      else finishWithConsent(didRequest);
    };
    // 이미지 단계: 삭제 예약(기준 18) 또는 업로드 — 순차 실행에서 실패 지점의 오류만
    // 표시되고 성공분은 재요청되지 않는다: 성공 즉시 선택·예약을 폐기한다.
    // 이미 기본 이미지(profileImageUrl=null)의 삭제 예약은 무변경 — 요청 생략 (기준 19)
    if (removalReserved && profile.profileImageUrl !== null) {
      removeImage(undefined, {
        onSuccess: () => {
          setRemovalReserved(false);
          finishWithNickname(true);
        },
      });
      return;
    }
    const selectedFile = selectedFileRef.current;
    if (selectedFile === null) {
      finishWithNickname(false);
      return;
    }
    upload.mutate(selectedFile, {
      onSuccess: () => {
        discardSelection();
        finishWithNickname(true);
      },
    });
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
        confirmText={isSaving ? "저장 중…" : "저장"}
        confirmDisabled={!canSaveProfile(nickname) || isSaving}
        onCancel={() => handleOpenChange(false)}
        onConfirm={handleConfirm}
        onClose={() => handleOpenChange(false)}
      >
        {/* 아바타 미리보기 + [변경]·[기본 이미지로] — 88px는 variant에 없어 size-22 오버라이드.
            src 우선순위: 삭제 예약(즉시 기본 이미지, MSG-407 기준 17) → 로컬 미리보기 →
            저장된 이미지 → 기본 이미지 (기준 9·16 — 닉네임 첫 글자 fallback은 기본 이미지
            에셋으로 대체, fallback 미전달) */}
        <div className="flex flex-col items-center gap-md">
          <Avatar
            size="lg"
            src={
              removalReserved
                ? DEFAULT_PROFILE_IMAGE
                : (previewUrl ??
                  profile.profileImageUrl ??
                  DEFAULT_PROFILE_IMAGE)
            }
            alt={profile.nickname}
            className="size-22"
          />
          {/* 숨김 파일 입력 — [변경] 칩이 대신 연다 (기준 8). aria-hidden 접근 트리 제외 */}
          <input
            ref={fileInputRef}
            type="file"
            accept={PROFILE_IMAGE_ACCEPT}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            disabled={isSaving}
            onChange={handleFileChange}
          />
          {/* 순수 프레젠테이셔널 트리거라 토글 시맨틱(aria-pressed)을 제거한다 —
              Chip은 aria-pressed={active}를 항상 렌더하지만 {...props}가 뒤에
              스프레드되므로 undefined 전달로 속성을 미노출 (PR #22 리뷰 반영,
              스모크 테스트로 속성 부재 고정) */}
          <div className="flex items-center gap-sm">
            <Chip
              text="변경"
              aria-pressed={undefined}
              disabled={isSaving}
              onClick={() => fileInputRef.current?.click()}
              className="border border-primary bg-transparent text-primary"
            />
            {/* [기본 이미지로] — 회색 테두리 칩 (MSG-407 기준 16, Figma 14783:4715).
                기본 이미지 상태에서도 노출 — 무변경 저장은 요청 생략 (기준 19) */}
            <Chip
              text="기본 이미지로"
              aria-pressed={undefined}
              disabled={isSaving}
              onClick={handleReserveRemoval}
              className="border border-border bg-transparent text-foreground-muted"
            />
          </div>
          <p className="text-center text-fm-caption text-foreground-muted">
            기본 이미지로 되돌리면 올린 사진은 삭제돼요.
          </p>
          {/* 크기 사전 검증·업로드 실패 인라인 안내 (기준 10·12, 추정 3 — Figma 오류 상태 부재) */}
          {errorMessage !== null && (
            <p role="alert" className="text-center text-fm-caption text-error">
              {errorMessage}
            </p>
          )}
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
          {isNicknameError && (
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
          {/* 위치동의 저장 실패 — 모달 유지 + 오류 표시 + [저장] 재시도 가능 (MSG-407 기준 13 실패 경로) */}
          {isConsentError && (
            <p role="alert" className="text-fm-label text-error">
              위치정보 동의 저장에 실패했어요. 다시 시도해주세요
            </p>
          )}
        </div>
      </ModalCard>
    </DialogShell>
  );
};
