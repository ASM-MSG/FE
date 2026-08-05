import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { AppHeader, Avatar, Button, Input, Switch } from "@fillmap/ui-native";
import { avatarFallback } from "../../../entities/profile/model/avatar-fallback";
import { canSaveProfile, locationStatusLabel } from "../model/profile-edit";
import { profileStore, useProfile } from "../model/profile-store";

/**
 * SOURCE: Figma "프로필 편집" (node 14094:4561) — MSG-306.
 * 뒤로가기 헤더 + 아바타·[변경] + 닉네임 입력 + 위치정보 토글 + [취소]/[저장].
 * 본문의 "프로필 편집" 중복 제목은 생략 — 헤더 타이틀만 유지 (승인 추정 2).
 * 드래프트(닉네임·토글)는 화면 로컬 상태 — [저장]에서만 profile-store에 반영하고
 * (AC 13), [취소]·뒤로가기는 반영 없이 복귀한다 (AC 14). 복귀는 router.back().
 * [변경]은 표시만(탭 무동작 — 업로드는 제외 범위, AC 10). 아바타 88px는 웹
 * ProfileEditModal의 size-22 오버라이드 선례를 미러한다.
 */
export const ProfileEditScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useProfile();
  // 진입 시 현재 프로필 값 프리필 (AC 11)
  const [nickname, setNickname] = useState(profile.nickname);
  const [locationEnabled, setLocationEnabled] = useState(
    profile.locationEnabled,
  );

  const handleSave = () => {
    profileStore.save({ nickname, locationEnabled });
    router.back();
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
          className="flex-1 gap-lg px-5 pt-lg"
          // 하단 safe-area + 여백 (업로드 플로우 preview-screen 선례)
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          {/* 아바타 + [변경] (AC 10) — [변경]은 표시만, 탭 무동작 (핸들러 미배선) */}
          <View className="items-center gap-md">
            <Avatar
              size="lg"
              alt={profile.nickname}
              fallback={avatarFallback(profile.nickname)}
              className="size-22"
            />
            <Button
              text="변경"
              variant="secondary"
              size="sm"
              shape="pill"
              className="border border-primary"
            />
          </View>

          {/* 닉네임 입력 (AC 11) — 현재 닉네임 프리필 */}
          <View className="gap-xs">
            <Text className="text-fm-label text-foreground">닉네임</Text>
            <Input value={nickname} onChangeText={setNickname} />
          </View>

          {/* 위치정보 토글 (AC 11·15) — 상태 문구는 locationStatusLabel */}
          <View className="gap-xs">
            <Text className="text-fm-label text-foreground">위치정보 사용</Text>
            <View className="flex-row items-center gap-xs">
              <Switch
                checked={locationEnabled}
                onCheckedChange={setLocationEnabled}
              />
              <Text className="text-fm-body text-foreground-muted">
                {locationStatusLabel(locationEnabled)}
              </Text>
            </View>
          </View>

          {/* [취소]/[저장] (AC 13·14·16) — 공백 닉네임이면 저장 비활성 (승인 추정 4) */}
          <View className="mt-auto flex-row gap-md pt-lg">
            <Button
              text="취소"
              variant="secondary"
              shape="pill"
              className="flex-1 border border-primary"
              onPress={() => router.back()}
            />
            <Button
              text="저장"
              variant="primary"
              shape="pill"
              className="flex-1"
              disabled={!canSaveProfile(nickname)}
              onPress={handleSave}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};
