import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { User } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader, Avatar, Button, Input } from "@fillmap/ui-native";
import { MOCK_PROFILE } from "../../../entities/profile/model/mock-profile";
import { useProfileQuery } from "../api/use-profile-query";
import { useRemoveProfileImage } from "../api/use-remove-profile-image";
import { useUpdateNickname } from "../api/use-update-nickname";
import {
  canSaveProfile,
  nicknameError,
  resolveNicknameSave,
  shouldRemoveProfileImage,
} from "../model/profile-edit";
import { profileImageErrorMessage } from "../model/profile-image";

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
 * [변경](업로드)은 여전히 표시만이다 — 티켓 동작 요구가 "두 버튼이 보인다"까지고
 * 이미지 업로드는 후속 티켓이다.
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

  /** [기본 이미지로] 예약 — 서버 반영은 [저장] 시점 (기준 15) */
  const [removalReserved, setRemovalReserved] = useState(false);

  const removeImage = useRemoveProfileImage();
  const saveNickname = useUpdateNickname({ onSaved: () => router.back() });
  const isSaving = removeImage.isPending || saveNickname.isPending;

  const validationMessage = nicknameError(nickname);
  const errorMessage =
    removeImage.error !== null
      ? profileImageErrorMessage(removeImage.error)
      : saveNickname.error !== null
        ? "닉네임 저장에 실패했어요. 다시 시도해주세요"
        : null;

  const handleSave = () => {
    const save = resolveNicknameSave(nickname, identity.nickname);
    // 순차 실행: 이미지 삭제 → 닉네임. 무변경 단계는 요청을 만들지 않는다
    const finishWithNickname = () => {
      if (save.shouldRequest) saveNickname.mutate(save.nickname);
      else router.back();
    };
    if (shouldRemoveProfileImage(removalReserved, identity.profileImageUrl)) {
      // 성공분이 재요청되지 않도록 예약을 즉시 폐기한다. 모달이 아니라 화면이라
      // 저장 중 언마운트가 없어 per-call 콜백으로 다음 단계를 잇는다
      removeImage.mutate(undefined, {
        onSuccess: () => {
          setRemovalReserved(false);
          finishWithNickname();
        },
      });
      return;
    }
    finishWithNickname();
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="프로필 편집" onBack={() => router.back()} />
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
            <Avatar
              size="lg"
              className="size-20"
              // 예약 즉시 기본 이미지로 보인다 — 서버 반영 전에도 결과를 미리 보여 준다
              src={
                removalReserved
                  ? undefined
                  : (identity.profileImageUrl ?? undefined)
              }
              alt={identity.nickname}
              fallbackIcon={<User size={40} color={semantic.muted} />}
            />
            <View className="flex-row items-center gap-sm">
              <Button
                text="변경"
                variant="secondary"
                size="sm"
                shape="pill"
                className="border border-primary"
              />
              <Button
                text="기본 이미지로"
                variant="secondary"
                size="sm"
                shape="pill"
                className="border border-border"
                disabled={isSaving}
                onPress={() => setRemovalReserved(true)}
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

          {/* [취소]/[저장] — [취소]·뒤로가기는 삭제 예약·닉네임 편집을 모두 폐기한다 (기준 15) */}
          <View className="mt-auto flex-row gap-md pt-lg">
            <Button
              text="취소"
              variant="secondary"
              shape="pill"
              className="flex-1 border border-primary"
              disabled={isSaving}
              onPress={() => router.back()}
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
    </View>
  );
};
