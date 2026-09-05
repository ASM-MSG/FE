import { useState } from "react";
import {
  launchImageLibraryAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import {
  toPermissionState,
  type PermissionState,
} from "../../../shared/permission-state";
import {
  useProfileImageUpload,
  type ProfileImageUploadVariables,
} from "../api/use-profile-image-upload";
import { useRemoveProfileImage } from "../api/use-remove-profile-image";
import { resolveProfileImageAction } from "../model/profile-edit";
import { profileImageErrorMessage } from "../model/profile-image";
import {
  measureFileSize,
  toProfileImageCandidate,
  type ProfileImageAssetLike,
} from "../model/profile-image-pick";

type GalleryPickOutcome =
  | { kind: "permission"; permission: PermissionState }
  | { kind: "canceled" }
  | { kind: "asset"; asset: ProfileImageAssetLike };

/**
 * 권한(결정 D12) → 갤러리 이미지 전용(D4) → `fileSize` 확보(스펙 Q2 실측). 네이티브 호출 3개가
 * 던지는 예외를 호출부의 try/catch 하나로 모으려고 컴포넌트 밖으로 뺐다 (codex·Claude 리뷰 —
 * `void pickImage()` 호출이라 잡지 않으면 unhandled rejection이 되고 화면은 침묵한다).
 */
const pickGalleryAsset = async (): Promise<GalleryPickOutcome> => {
  const permission = toPermissionState(
    await requestMediaLibraryPermissionsAsync(),
  );
  if (permission !== "granted") return { kind: "permission", permission };
  const result = await launchImageLibraryAsync({ mediaTypes: "images" });
  const asset = result.canceled ? undefined : result.assets[0];
  if (asset === undefined) return { kind: "canceled" };
  return {
    kind: "asset",
    asset: {
      ...asset,
      fileSize: asset.fileSize ?? (await measureFileSize(asset.uri)),
    },
  };
};

/**
 * 프로필 편집의 **이미지 축** — 갤러리 선택·삭제 예약·거부 캡션·권한 안내 + 업로드/삭제
 * 뮤테이션 + [저장]의 이미지 단계 (MSG-564). 화면에서 분리한 이유: 닉네임 축과 한 컴포넌트에
 * 있을 때 React Doctor 복잡도 상한(cyclomatic 18)을 넘었다(PR #129). 두 축은 상태를 공유하지
 * 않고 `nicknameSaving`(저장 중 재선택 차단)만 흘러들어 경계가 자연스럽다.
 *
 * 선택과 삭제 예약은 마지막 조작이 이긴다(결정 D2). 서버 반영은 전부 [저장] 시점(D1).
 */
export const useProfileImageEdit = ({
  nicknameSaving,
}: {
  nicknameSaving: boolean;
}) => {
  /** 갤러리에서 고른 이미지 — 선택 시 삭제 예약을 푼다 */
  const [selected, setSelected] = useState<ProfileImageUploadVariables | null>(
    null,
  );
  /** 선택 직후 형식·크기 거부 문구 (기준 2) — 요청 없이 캡션만, 이전 미리보기는 유지 */
  const [pickError, setPickError] = useState<string | null>(null);
  /** [기본 이미지로] 예약 (기준 15) — 예약 시 선택을 폐기한다 */
  const [removalReserved, setRemovalReserved] = useState(false);
  /** 갤러리 권한 안내 — null이면 닫힘 (기준 10) */
  const [galleryNotice, setGalleryNotice] = useState<PermissionState | null>(
    null,
  );

  const upload = useProfileImageUpload();
  const removeImage = useRemoveProfileImage();
  const isSaving = upload.isPending || removeImage.isPending || nicknameSaving;

  // 우선순위: 선택 거부 → 업로드 실패 → 삭제 실패 (웹 `sizeError ?? upload.error ?? remove.error` 미러)
  const errorMessage =
    pickError ??
    (upload.error !== null
      ? profileImageErrorMessage(upload.error)
      : removeImage.error !== null
        ? profileImageErrorMessage(removeImage.error)
        : null);

  /**
   * [변경] — 권한 → 갤러리 → 사전 검증(D3) → 로컬 미리보기. 이 시점에 네트워크 요청은 없다
   * (기준 1). 저장 중에는 받지 않는다 — 재선택이 `reset()`으로 진행 중 뮤테이션의 가드를 풀면
   * 늦게 완료된 이전 업로드가 새 선택을 덮어쓴다(웹 PR #51 리뷰).
   */
  const pickImage = async () => {
    if (isSaving) return;
    let outcome: GalleryPickOutcome;
    try {
      outcome = await pickGalleryAsset();
    } catch (error) {
      // 권한·피커·실측 어느 예외든 거부 캡션으로 (FALLBACK 문구)
      setPickError(profileImageErrorMessage(error));
      return;
    }
    if (outcome.kind === "permission") {
      // 직전 형식·크기 거부 캡션이 권한 모달 뒤에 남지 않게 (Claude 리뷰 🟢)
      setPickError(null);
      setGalleryNotice(outcome.permission);
      return;
    }
    if (outcome.kind === "canceled") return;
    const pick = toProfileImageCandidate(outcome.asset);
    if (pick.kind === "rejected") {
      setPickError(pick.message);
      return;
    }
    setSelected({ uri: pick.uri, candidate: pick.candidate });
    // 새 선택은 삭제 예약과 상호 배타 — 예약을 해제한다 (결정 D2)
    setRemovalReserved(false);
    setPickError(null);
    upload.reset();
    removeImage.reset();
  };

  /** [기본 이미지로] — 삭제 예약 + 진행 중이던 선택 폐기 (결정 D2). 요청은 [저장] 시점 */
  const reserveRemoval = () => {
    setSelected(null);
    setPickError(null);
    upload.reset();
    removeImage.reset();
    setRemovalReserved(true);
  };

  /**
   * [저장]의 이미지 단계 — 업로드/삭제/무변경 판정 뒤 `onDone`(닉네임 단계). 성공분이
   * 재요청되지 않도록 선택·예약을 즉시 폐기한다. 다음 단계를 per-call 콜백으로 잇는 것은
   * 저장 중 이탈이 **막혀 있기 때문에** 안전하다 — 화면의 leaveIfIdle·hardwareBackPress
   * 가드가 그 전제를 강제한다(가드가 없으면 이미지만 바뀌고 닉네임 저장이 조용히 누락된다 —
   * MSG-426 리뷰)
   */
  const saveImage = (profileImageUrl: string | null, onDone: () => void) => {
    const action = resolveProfileImageAction({
      hasSelection: selected !== null,
      removalReserved,
      profileImageUrl,
    });
    if (action === "remove") {
      removeImage.mutate(undefined, {
        onSuccess: () => {
          setRemovalReserved(false);
          onDone();
        },
      });
      return;
    }
    if (action === "upload" && selected !== null) {
      upload.mutate(selected, {
        onSuccess: () => {
          setSelected(null);
          onDone();
        },
      });
      return;
    }
    onDone();
  };

  return {
    /** 로컬 미리보기 uri — 아바타 src 우선순위 2번째 (예약 → 미리보기 → 서버 → 기본) */
    selectedUri: selected?.uri ?? null,
    removalReserved,
    /** S3 왕복 중 — 진행 오버레이 (기준 7, Q1) */
    uploading: upload.isPending,
    isSaving,
    errorMessage,
    galleryNotice,
    dismissGalleryNotice: () => setGalleryNotice(null),
    pickImage,
    reserveRemoval,
    saveImage,
  };
};
