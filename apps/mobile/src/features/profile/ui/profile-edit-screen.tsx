import { useEffect, useEffectEvent, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  launchImageLibraryAsync,
  requestMediaLibraryPermissionsAsync,
} from "expo-image-picker";
import { useRouter } from "expo-router";
import { User } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader, Avatar, Button, Input } from "@fillmap/ui-native";
import { MOCK_PROFILE } from "../../../entities/profile/model/mock-profile";
import {
  toPermissionState,
  type PermissionState,
} from "../../../shared/permission-state";
import { PermissionNoticeModal } from "../../permissions/ui/permission-notice-modal";
import {
  useProfileImageUpload,
  type ProfileImageUploadVariables,
} from "../api/use-profile-image-upload";
import { useProfileQuery } from "../api/use-profile-query";
import { useRemoveProfileImage } from "../api/use-remove-profile-image";
import { useUpdateNickname } from "../api/use-update-nickname";
import {
  canSaveProfile,
  nicknameError,
  resolveNicknameSave,
  resolveProfileImageAction,
} from "../model/profile-edit";
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
 * SOURCE: Figma "프로필 편집" (node 14799:26233) — MSG-306 → MSG-426 개편.
 * 뒤로가기 헤더 + 아바타 + [변경]/[기본 이미지로] + 안내 캡션 + 닉네임 입력 + [취소]/[저장].
 * 본문의 "프로필 편집" 중복 제목은 생략 — 헤더 타이틀만 유지 (MSG-306 승인 추정 2 승계,
 * 결정 Q5). Figma 대조 시 오탐하지 않도록 스펙 R4-1에 기재돼 있다.
 *
 * [MSG-426] 바뀐 것: ① `위치정보 사용` 섹션·토글 제거 — 동의 관리는 설정 행으로 일원화
 * (기준 16) ② [기본 이미지로] + 안내 캡션 추가(기준 14) ③ **삭제 예약** 패턴 — 탭하면
 * 아바타만 즉시 기본 이미지로 바뀌고 요청은 [저장] 시점에 나간다. [취소]·뒤로가기면
 * 화면 로컬 상태와 함께 폐기된다(기준 15, 웹 MSG-407 미러) ④ 닉네임 2~20자 검증 사유
 * 표시(기준 17) ⑤ 저장이 `PUT /api/users/me/nickname` 실연동(결정 E2-b).
 *
 * [MSG-564] [변경]이 실연동됐다 (웹 MSG-378 `ProfileEditModal` 미러): 갤러리(이미지 전용,
 * 크롭 없음) → 형식·5MB 사전 검증 → 로컬 미리보기, 업로드는 [저장] 시점에 presign → S3 PUT →
 * 확정(결정 D1). 선택과 삭제 예약은 마지막 조작이 이긴다(D2). 업로드 중 아바타 위 진행
 * 오버레이(Q1), 갤러리 권한 거부는 차단형 `PermissionNoticeModal`(Q3). 진행 오버레이·권한
 * 모달·선택 거부 캡션은 Figma 노드에 없다 — 티켓 요구에 따른 의도적 추가.
 */
export const ProfileEditScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile } = useProfileQuery();
  // 조회 전·실패 시 mock 폴백 — 편집 화면도 조회에 잠기지 않는다 (결정 E2)
  const identity = profile ?? MOCK_PROFILE;

  const [nickname, setNickname] = useState(identity.nickname);
  // 조회가 마운트 이후 도착하면 프리필을 서버값으로 다시 맞춘다 — 렌더 중 상태 조정
  // (ui-native Avatar의 prevSrc 선례). 단 **사용자가 아직 손대지 않았을 때만** 덮어쓴다 —
  // mock 폴백으로 먼저 뜬 화면에 입력을 시작한 뒤 getMe가 도착하면 그 입력이 사라진다
  // (codex 리뷰). `nickname === prefilled`가 곧 "직전 프리필 이후 편집 없음"이다.
  const [prefilled, setPrefilled] = useState(identity.nickname);
  if (identity.nickname !== prefilled) {
    const untouched = nickname === prefilled;
    setPrefilled(identity.nickname);
    if (untouched) setNickname(identity.nickname);
  }

  /** 갤러리에서 고른 이미지 — 서버 반영은 [저장] 시점 (결정 D1). 선택 시 삭제 예약을 푼다 */
  const [selected, setSelected] = useState<ProfileImageUploadVariables | null>(
    null,
  );
  /** 선택 직후 형식·크기 거부 문구 (기준 2) — 요청 없이 캡션만, 이전 미리보기는 유지 */
  const [pickError, setPickError] = useState<string | null>(null);
  /** [기본 이미지로] 예약 — 서버 반영은 [저장] 시점 (기준 15). 예약 시 선택을 폐기한다 */
  const [removalReserved, setRemovalReserved] = useState(false);
  /** 갤러리 권한 안내 — null이면 닫힘 (기준 10) */
  const [galleryNotice, setGalleryNotice] = useState<PermissionState | null>(
    null,
  );

  const upload = useProfileImageUpload();
  const removeImage = useRemoveProfileImage();
  const saveNickname = useUpdateNickname({ onSaved: () => router.back() });
  const isSaving =
    upload.isPending || removeImage.isPending || saveNickname.isPending;

  const validationMessage = nicknameError(nickname);
  // 우선순위: 선택 거부 → 업로드 실패 → 삭제 실패 → 닉네임 실패 (웹 `sizeError ?? upload.error ?? remove.error` 미러)
  const errorMessage =
    pickError ??
    (upload.error !== null
      ? profileImageErrorMessage(upload.error)
      : removeImage.error !== null
        ? profileImageErrorMessage(removeImage.error)
        : saveNickname.error !== null
          ? "닉네임 저장에 실패했어요. 다시 시도해주세요"
          : null);

  /**
   * [변경] — 권한(결정 D12) → 갤러리 이미지 전용(D4) → 사전 검증(D3) → 로컬 미리보기.
   * 이 시점에 네트워크 요청은 없다 (기준 1). 저장 중에는 받지 않는다 — 재선택이 `reset()`으로
   * 진행 중 뮤테이션의 가드를 풀면 늦게 완료된 이전 업로드가 새 선택을 덮어쓴다(웹 PR #51 리뷰).
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

  const handleSave = () => {
    const save = resolveNicknameSave(nickname, identity.nickname);
    // 순차 실행: 이미지(업로드 또는 삭제) → 닉네임. 무변경 단계는 요청을 만들지 않는다
    const finishWithNickname = () => {
      if (save.shouldRequest) saveNickname.mutate(save.nickname);
      else router.back();
    };
    // 성공분이 재요청되지 않도록 선택·예약을 즉시 폐기한다. 다음 단계를 per-call 콜백으로
    // 잇는 것은 저장 중 이탈이 **막혀 있기 때문에** 안전하다 — 아래 leaveIfIdle과
    // hardwareBackPress 가드가 그 전제를 강제한다(가드가 없으면 이미지만 바뀌고
    // 닉네임 저장이 조용히 누락된다 — MSG-426 리뷰)
    const action = resolveProfileImageAction({
      hasSelection: selected !== null,
      removalReserved,
      profileImageUrl: identity.profileImageUrl,
    });
    if (action === "remove") {
      removeImage.mutate(undefined, {
        onSuccess: () => {
          setRemovalReserved(false);
          finishWithNickname();
        },
      });
      return;
    }
    if (action === "upload" && selected !== null) {
      upload.mutate(selected, {
        onSuccess: () => {
          setSelected(null);
          finishWithNickname();
        },
      });
      return;
    }
    finishWithNickname();
  };

  /**
   * 저장 비행 중에는 이탈을 받지 않는다 (MSG-426 리뷰). 이미지 → 닉네임의 순차 실행이
   * per-call 콜백으로 이어져 있어, 중간에 이 화면이 언마운트되면 **이미지는 서버에서 바뀌었는데
   * 닉네임 저장만 조용히 누락**된다(사용자에게 오류도 안 보인다). 하단 [취소]/[저장]은 이미
   * `disabled={isSaving}`인데 헤더 `‹`와 하드웨어 뒤로가기만 열려 있던 구멍을 막는다.
   * MSG-422 `abortSignup` 가드와 같은 취지다.
   */
  const leaveIfIdle = () => {
    if (isSaving) return;
    router.back();
  };

  // Effect Event로 감싸 구독을 마운트 1회로 고정한다 — 본문이 읽는 isSaving은 매번 최신이지만
  // 의존성이 아니므로 저장 상태 변화가 BackHandler를 재등록시키지 않는다.
  // 저장 중이면 true를 돌려 기본 동작(이전 화면)을 막고, 평시에는 false로 라우터에 맡긴다.
  //
  // 이 구독 보일러플레이트는 동의 게이트·도감과 3중 복제다. 공용 훅 추출을 시도했으나
  // **React가 Effect Event를 다른 훅·함수로 넘기는 것을 금지한다**(rules-of-hooks:
  // "cannot be assigned to a variable or passed down") — 판정 함수가 각 화면의 상태를
  // 읽어야 하므로 추출이 불가능하다. nose.baseline.json에 의도 중복으로 등재했다.
  const handleHardwareBack = useEffectEvent(() => isSaving);

  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () =>
      handleHardwareBack(),
    );
    return () => subscription.remove();
  }, []);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="프로필 편집" onBack={leaveIfIdle} />
      <ScrollView
        className="flex-1"
        // grow: 콘텐츠가 짧아도 mt-auto 버튼 행이 화면 하단에 붙게 컨테이너를 채운다
        contentContainerClassName="grow"
        keyboardShouldPersistTaps="handled"
      >
        <View
          // grow(≠flex-1): flex-1은 flexBasis 0으로 높이를 뷰포트에 고정해, 콘텐츠가 더 길면
          // mt-auto 버튼 행이 컨테이너 밖으로 밀려 잘리고 터치도 먹지 않는다(실기에서 확인).
          // grow는 max(콘텐츠, 뷰포트)라 짧으면 하단 고정, 길면 스크롤이 생긴다
          className="grow gap-lg px-5 pt-lg"
          // 하단 safe-area + 여백 (업로드 플로우 preview-screen 선례)
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          {/* 아바타 + [변경]/[기본 이미지로] + 안내 (기준 14·15) — 아바타 80px */}
          <View className="items-center gap-md">
            <View className="relative">
              <Avatar
                size="lg"
                className="size-20"
                // 우선순위: 예약(기본 이미지) → 로컬 미리보기 → 서버 → 기본 (웹 미러) —
                // 서버 반영 전에도 결과를 미리 보여 준다
                src={
                  removalReserved
                    ? undefined
                    : (selected?.uri ?? identity.profileImageUrl ?? undefined)
                }
                alt={identity.nickname}
                fallbackIcon={<User size={40} color={semantic.muted} />}
              />
              {/* 업로드 진행 표시 (기준 7, Q1) — S3 왕복 중에만. 삭제·닉네임 저장은 버튼 문구로 충분 */}
              {upload.isPending && (
                <View className="absolute inset-0 items-center justify-center rounded-full bg-background/60">
                  <ActivityIndicator color={semantic.primary} />
                </View>
              )}
            </View>
            <View className="flex-row items-center gap-sm">
              <Button
                text="변경"
                variant="secondary"
                size="sm"
                shape="pill"
                className="border border-primary"
                disabled={isSaving}
                onPress={() => void pickImage()}
              />
              <Button
                text="기본 이미지로"
                variant="secondary"
                size="sm"
                shape="pill"
                className="border border-border"
                disabled={isSaving}
                onPress={reserveRemoval}
              />
            </View>
            <Text className="text-center text-fm-caption text-foreground-muted">
              기본 이미지로 되돌리면 올린 사진은 삭제돼요.
            </Text>
            {errorMessage !== null && (
              <Text
                accessibilityRole="alert"
                className="text-center text-fm-caption text-red-600"
              >
                {errorMessage}
              </Text>
            )}
          </View>

          {/* 닉네임 입력 (기준 17) — 현재 닉네임 프리필 + 범위 밖 사유 안내 */}
          <View className="gap-xs">
            <Text className="text-fm-label text-foreground">닉네임</Text>
            <Input value={nickname} onChangeText={setNickname} />
            {validationMessage !== null && (
              <Text className="text-fm-label text-red-600">
                {validationMessage}
              </Text>
            )}
          </View>

          {/* [취소]/[저장] — [취소]·뒤로가기는 선택·삭제 예약·닉네임 편집을 모두 폐기한다 (기준 15) */}
          <View className="mt-auto flex-row gap-md pt-lg">
            <Button
              text="취소"
              variant="secondary"
              shape="pill"
              className="flex-1 border border-primary"
              disabled={isSaving}
              onPress={leaveIfIdle}
            />
            <Button
              text={isSaving ? "저장 중…" : "저장"}
              variant="primary"
              shape="pill"
              className="flex-1"
              disabled={!canSaveProfile(nickname) || isSaving}
              onPress={handleSave}
            />
          </View>
        </View>
      </ScrollView>

      {/* 갤러리 권한 안내 (기준 10, Q3) — [권한 요청]은 픽커를 다시 열고, [설정 열기]는 모달이 처리 */}
      <PermissionNoticeModal
        axis="gallery"
        state={galleryNotice}
        onDismiss={() => setGalleryNotice(null)}
        onRequest={() => void pickImage()}
      />
    </View>
  );
};
