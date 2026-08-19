import { useState, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { User } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader, Avatar, Button, ModalCard } from "@fillmap/ui-native";
import { MOCK_PROFILE } from "../../../entities/profile/model/mock-profile";
import { goToLogin } from "../../../shared/navigation";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import { useLogout } from "../../auth/api/use-logout";
import { useNotificationToggle } from "../api/use-notification-toggle";
import { useProfileQuery } from "../api/use-profile-query";
import { formatJoinedDate } from "../model/profile-format";
import { DeleteAccountModal } from "./delete-account-modal";
import { SettingInfoRow, SettingRow, SettingToggleRow } from "./setting-rows";

/** 섹션 블록 — 제목 + 행 리스트. 행 간격 18px은 Figma 설정-rows/계정-rows 실측 */
const ProfileSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <View className="gap-sm">
    <Text className="text-fm-title text-foreground">{title}</Text>
    <View className="gap-4.5">{children}</View>
  </View>
);

/** 내 활동 스탯 1칸 — 라벨(캡션) 위, 값(타이틀) 아래 */
const ActivityStat = ({
  label,
  value,
  alignEnd,
}: {
  label: string;
  value: string;
  alignEnd?: boolean;
}) => (
  <View className={alignEnd ? "items-end gap-xxs" : "gap-xxs"}>
    <Text className="text-fm-caption text-foreground-muted">{label}</Text>
    <Text className="text-fm-title text-foreground">{value}</Text>
  </View>
);

/** 알림 저장 실패 안내 (기준 5) — 다음 시도가 시작되면 사라진다 */
const NOTIFICATION_ERROR_TEXT =
  "알림 설정을 저장하지 못했어요. 잠시 후 다시 시도해주세요";

/**
 * SOURCE: Figma "프로필/설정" (node 14799:26141) — MSG-306 → MSG-426 개편.
 * 프로필 카드(아바타·닉네임·가입일·이메일·[편집]) + 내 활동 + 설정(플랫 행 3개) +
 * 계정(플랫 행 4개) + 전폭 [로그아웃] + 확인 모달 2종 + AppBottomNav.
 *
 * [MSG-426] 바뀐 것: ① 설정·계정 행에서 카드 클래스 제거(기준 1·7) ② `알림 설정 ›` →
 * `알림 받기` 토글 실연동(기준 2~6) ③ `계정 삭제`(red-600) 행 + 확인 모달 + 탈퇴(기준 8~10)
 * ④ 로그아웃 버튼 전폭화 + 확인 모달의 [로그아웃]을 `useLogout`에 배선(기준 11, 결정 E4)
 * ⑤ 아바타 기본 이미지 플레이스홀더(기준 12) ⑥ 가입일·이메일 줄 말줄임 제거(기준 13)
 * ⑦ 닉네임·이메일·가입일·프로필이미지를 `getMe` 실값으로(결정 E2 — 조회 실패·로딩에는
 * mock 폴백이라 화면이 잠기지 않는다) ⑧ 앱 버전은 빌드 주입값(결정 Q4).
 * 프로필 카드·내 활동 카드는 Figma에 카드가 있으므로 형태를 유지한다.
 */
export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile } = useProfileQuery();
  // 조회 전·실패 시 mock 폴백 — 게이트를 세우지 않는다 (결정 E2)
  const identity = profile ?? MOCK_PROFILE;
  const notifications = useNotificationToggle();
  const logout = useLogout();
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const joinedText = `가입일 ${formatJoinedDate(identity.joinedAt)}`;
  // 카카오 가입은 이메일을 수집하지 않아 null이 올 수 있다 — 그때는 가입일만 보인다
  const metaText =
    identity.email === null ? joinedText : `${joinedText} · ${identity.email}`;

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="프로필/설정" />
      <ScrollView className="flex-1">
        <View className="gap-lg px-5 pb-lg pt-md">
          {/* 프로필 카드 (기준 12·13) — 아바타 56px, [편집]은 편집 화면 이동 */}
          <View className="flex-row items-center gap-sm rounded-md border border-border bg-surface-soft px-md py-sm">
            <Avatar
              size="lg"
              className="size-14"
              src={identity.profileImageUrl ?? undefined}
              alt={identity.nickname}
              // 업로드 이미지가 없으면 사람 실루엣 기본 이미지 (기준 12 — 이니셜 텍스트 아님)
              fallbackIcon={<User size={28} color={semantic.muted} />}
            />
            <View className="min-w-0 flex-1 gap-xxs">
              <Text className="text-fm-title text-foreground" numberOfLines={1}>
                {identity.nickname}
              </Text>
              {/* numberOfLines 없음 — 긴 이메일도 말줄임 없이 줄바꿈된다 (기준 13) */}
              <Text className="text-fm-body text-foreground-muted">
                {metaText}
              </Text>
            </View>
            <Button
              text="편집"
              variant="primary"
              size="sm"
              shape="pill"
              onPress={() => router.navigate("/profile/edit")}
            />
          </View>

          {/* 내 활동 — 좌측 스트릭 · 우측 수집률 (mock 유지, 대응 API 연동은 범위 밖) */}
          <ProfileSection title="내 활동">
            <View className="flex-row items-center justify-between rounded-md border border-border bg-surface-soft p-md">
              <ActivityStat
                label="스트릭"
                value={`${MOCK_PROFILE.streakDays}일 연속`}
              />
              <ActivityStat
                label="수집률"
                value={`${MOCK_PROFILE.collectionRate.regionLabel} ${MOCK_PROFILE.collectionRate.pct}%`}
                alignEnd
              />
            </View>
          </ProfileSection>

          {/* 설정 (기준 1~6) — 상세 화면 2종은 후속 티켓이라 "준비 중" 비활성 행 */}
          <ProfileSection title="설정">
            <SettingRow label="위치정보 동의 관리" hint="준비 중" />
            <SettingToggleRow
              label="알림 받기"
              checked={notifications.checked}
              onCheckedChange={notifications.toggle}
              busy={notifications.isPending}
              errorText={
                notifications.isError ? NOTIFICATION_ERROR_TEXT : undefined
              }
            />
            <SettingRow label="신고 관리" hint="준비 중" />
          </ProfileSection>

          {/* 계정 (기준 7~10) — 앱 버전은 정보 행(› 없음), 계정 삭제만 동작 행 */}
          <ProfileSection title="계정">
            <SettingInfoRow
              label="앱 버전"
              // 하드코딩 mock은 행의 의미 자체를 거짓으로 만든다 — 빌드 주입값 (결정 Q4)
              value={Constants.expoConfig?.version ?? "1.0.0"}
            />
            <SettingRow label="서비스 이용약관" hint="준비 중" />
            <SettingRow label="개인정보 처리방침" hint="준비 중" />
            <SettingRow
              label="계정 삭제"
              tone="danger"
              onPress={() => setDeleteOpen(true)}
            />
          </ProfileSection>

          {/* [로그아웃] (기준 11) — 스크롤 콘텐츠 하단 전폭. 채움은 variant="danger"(bg-error)로,
              red-600은 텍스트 전용 규약이라 여기 쓰지 않는다 (스펙 R4-6) */}
          <Button
            text="로그아웃"
            variant="danger"
            className="w-full"
            onPress={() => setLogoutOpen(true)}
          />
        </View>
      </ScrollView>
      <AppBottomNav />

      {/* 로그아웃 확인 모달 — MSG-306이 표시까지만 만들고 남긴 [로그아웃] 배선을 여기서 잇는다
          (결정 E4). 로그아웃 후 프로필에 머무르면 비로그인 상태로 남의 화면을 보게 되므로
          정산 시점에 로그인으로 replace 이동한다 (계정 삭제 경로와 동형) */}
      <ModalCard
        visible={logoutOpen}
        title="로그아웃"
        description="정말 로그아웃하시겠습니까?"
        cancelText="취소"
        confirmText={logout.isPending ? "로그아웃 중…" : "로그아웃"}
        confirmVariant="danger"
        confirmDisabled={logout.isPending}
        onCancel={() => setLogoutOpen(false)}
        onOverlayPress={() => setLogoutOpen(false)}
        onConfirm={() =>
          logout.mutate(undefined, {
            onSettled: () => {
              setLogoutOpen(false);
              goToLogin();
            },
          })
        }
      />

      {/* 계정 삭제 확인 모달 (기준 9·10) */}
      <DeleteAccountModal
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={goToLogin}
      />
    </View>
  );
};
