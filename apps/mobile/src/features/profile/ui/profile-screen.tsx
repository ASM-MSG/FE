import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import {
  Bell,
  Clapperboard,
  FileText,
  Flag,
  Flame,
  Inbox,
  Info,
  Lock,
  Map,
  MapPin,
  Trash2,
  UserX,
} from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader, ModalCard } from "@fillmap/ui-native";
import { PENDING_PROFILE } from "../../../entities/profile/model/profile";
import { goToLogin, goToTermsDocument } from "../../../shared/navigation";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import { useLogout } from "../../auth/api/use-logout";
import { featuredBadgesOf } from "../../dex/model/badge-showcase";
import { formatProgressRate } from "../../dex/model/region-label";
import { useBadgesQuery } from "../../dex/model/use-collection-query";
import { PermissionSettingsNotice } from "../../permissions/ui/permission-settings-notice";
import { useUnreadCountQuery } from "../../notifications/api/use-unread-count-query";
import { usePushRegistration } from "../../notifications/api/use-push-registration";
import { useActivityQuery } from "../api/use-activity-query";
import { useNotificationToggle } from "../api/use-notification-toggle";
import { useProfileQuery } from "../api/use-profile-query";
import { formatStreakDays } from "../model/activity-summary";
import { resolveNotificationNotice } from "../model/notification-toggle";
import { formatDaysTogether, formatJoinedDate } from "../model/profile-format";
import { ActivityTiles } from "./activity-tiles";
import { DeleteAccountModal } from "./delete-account-modal";
import { ProfileHero } from "./profile-hero";
import { SettingGroup } from "./setting-group";
import { SettingInfoRow, SettingRow, SettingToggleRow } from "./setting-rows";

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
 *
 * [2026-09-25 리디자인] Figma "제안 — 프로필/설정 리디자인"(16182:359): 회색 바탕 위 흰 카드 —
 * 프로필 히어로(아바타 72·편집 배지·대표 뱃지 pill, 이메일 미표시) + 활동 타일 3개(스트릭·수집률·내 영상)
 * + 그룹 카드 3개(활동/안전/계정, 행마다 아이콘 원) + 로그아웃은 하단 텍스트 링크. 데이터·핸들러·모달은
 * 종전과 동일하고 레이아웃만 바뀌었다(사용자: "설정 탭 개선안 개발").
 */
export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { data: profile } = useProfileQuery();
  // 조회 전·실패 시 빈 정체성 — 게이트를 세우지 않되 가짜 계정을 보이지도 않는다 (결정 E2 → MSG-606 M2)
  const identity = profile ?? PENDING_PROFILE;
  const activity = useActivityQuery();
  const notifications = useNotificationToggle();
  const push = usePushRegistration();
  const unread = useUnreadCountQuery();
  // 대표 뱃지 — 도감과 같은 queryKey라 캐시를 공유한다. 조회 전·실패는 빈 배열(pill 미렌더)
  const badges = useBadgesQuery();
  const featuredBadges = featuredBadgesOf(badges.data ?? []);
  const notificationNotice = resolveNotificationNotice({
    permission: push.permission,
    pushError: push.error,
    preferencesFailed: notifications.isError,
  });
  const logout = useLogout({
    onSettled: () => {
      setLogoutOpen(false);
      goToLogin();
    },
  });
  const [logoutOpen, setLogoutOpen] = useState(false);

  /**
   * 로그아웃 확인 모달 닫기 — 진행 중에는 닫지 않는다 (계정 삭제 모달과 동형).
   * 확인을 누른 뒤에는 서버 호출 성패와 무관하게 로컬 세션이 끊기므로(로컬 우선 종료)
   * 되돌릴 수 없다. 그때 모달만 닫아 주면 "취소했는데 잠시 뒤 로그인 화면으로 튕기는"
   * 것처럼 보인다 — 진행 중임을 계속 보여 주는 편이 정직하다 (MSG-426 리뷰).
   */
  const closeLogoutModal = () => {
    if (logout.isPending) return;
    setLogoutOpen(false);
  };
  const [deleteOpen, setDeleteOpen] = useState(false);

  // "2026.09.25 가입 · N일째 함께" — 이메일은 더 이상 카드에 보이지 않는다(리디자인). 조회 전에는 로딩 문구
  const metaText =
    profile === undefined
      ? "프로필을 불러오는 중"
      : `${formatJoinedDate(identity.joinedAt)} 가입 · ${formatDaysTogether(identity.joinedAt, new Date())}`;

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top }}>
      <AppHeader title="프로필" />
      <ScrollView className="flex-1">
        <View className="gap-md px-5 pb-lg pt-sm">
          {/* 프로필 히어로 (기준 12·13) — 아바타 탭 = 편집 화면 */}
          <ProfileHero
            nickname={identity.nickname}
            profileImageUrl={identity.profileImageUrl}
            metaText={metaText}
            badges={featuredBadges}
            onEdit={() => router.navigate("/profile/edit")}
          />

          {/* 활동 타일 3개 (MSG-564 기준 14) — 실값은 `useActivityQuery`, 조회 전·실패 축은 `—` */}
          <ActivityTiles
            onPress={() => router.navigate("/dex")}
            tiles={[
              {
                icon: <Flame size={18} color={semantic.primary} />,
                label: "스트릭",
                value:
                  activity.streakDays === null
                    ? "—"
                    : formatStreakDays(activity.streakDays),
              },
              {
                icon: <Map size={18} color={semantic.primary} />,
                label: "수집률",
                value:
                  activity.collectionRate === null
                    ? "—"
                    : formatProgressRate(activity.collectionRate),
              },
              {
                icon: <Clapperboard size={18} color={semantic.primary} />,
                label: "내 영상",
                value:
                  activity.videoCount === null
                    ? "—"
                    : `${activity.videoCount}개`,
              },
            ]}
          />

          {/* 활동 그룹 (기준 1~6) — [MSG-448] "준비 중" 2행이 실제 목적지로 배선됐다 */}
          <SettingGroup title="활동">
            {/* 알림함 (MSG-602) — 안읽음은 빨간 숫자 배지 (PRD MSG-434 FR-6) */}
            <SettingRow
              label="알림함"
              icon={<Inbox size={18} color={semantic.primary} />}
              iconTone="primary"
              badgeCount={unread.data ?? 0}
              divider
              onPress={() => router.navigate("/profile/notifications")}
            />
            {/*
              MSG-429 기준 14·15 — 이 스위치 하나가 두 축을 움직인다: 서버 preferences
              전 종(8종, MSG-426→MSG-482) 일괄 저장과 OS 알림 권한 + FCM 토큰 등록/해제(MSG-429).
              **표시 정본은 푸시 축**이다(웹 MSG-408 미러) — 권한이 없거나 토큰이 등록되지
              않았으면 preferences가 켜져 있어도 OFF로 보인다. "켰는데 알림이 안 온다"를
              만들지 않기 위해서다. 권한 요청은 이 탭(사용자 제스처) 안에서만 일어난다.
            */}
            <SettingToggleRow
              label="알림 받기"
              icon={<Bell size={18} color={semantic.primary} />}
              divider
              checked={push.enabled}
              onCheckedChange={(next) => {
                notifications.toggle(next);
                void push.setEnabled(next);
              }}
              busy={notifications.isPending || push.busy}
              // 재시도로 풀리는 실패만 행 안 캡션으로 (MSG-447 기준 12)
              errorText={
                notificationNotice?.kind === "text"
                  ? notificationNotice.text
                  : undefined
              }
            />
            {/*
              MSG-447 기준 11·14 — OS 권한 거부는 앱 안에서 고칠 수 없어 **탭 가능한** 설정
              진입점이 필요하다. 행 컴포넌트를 고치지 않고 형제로 붙인다 (결정 D4).
              토글을 한 번도 건드리지 않아도 보인다 — 판정이 `push.permission`(기기 실상태)을
              함께 보기 때문이다. 설정에서 켜고 돌아오면 포그라운드 재판독으로 사라진다(기준 13).
            */}
            {notificationNotice?.kind === "settings" && (
              <View className="px-sm pb-xs">
                <PermissionSettingsNotice message={notificationNotice.text} />
              </View>
            )}
            <SettingRow
              label="위치정보 동의 관리"
              icon={<MapPin size={18} color={semantic.primary} />}
              iconTone="primary"
              onPress={() => router.navigate("/profile/consent")}
            />
          </SettingGroup>

          <SettingGroup title="안전">
            <SettingRow
              label="신고 관리"
              icon={<Flag size={18} color={semantic.body} />}
              divider
              onPress={() => router.navigate("/profile/reports")}
            />
            {/* MSG-570 기준 12 — 차단한 사용자 목록·해제 */}
            <SettingRow
              label="차단한 사용자"
              icon={<UserX size={18} color={semantic.body} />}
              onPress={() => router.navigate("/profile/blocks")}
            />
          </SettingGroup>

          {/* 계정 (기준 7~10) — 앱 버전은 정보 행(› 없음). [MSG-448] 약관 2행도 동작 행 */}
          <SettingGroup title="계정">
            {/* 같은 약관 뷰어를 문서 키로 공유한다 (MSG-448 기준 5) */}
            <SettingRow
              label="서비스 이용약관"
              icon={<FileText size={18} color={semantic.body} />}
              divider
              onPress={() => goToTermsDocument("service")}
            />
            <SettingRow
              label="개인정보 처리방침"
              icon={<Lock size={18} color={semantic.body} />}
              divider
              onPress={() => goToTermsDocument("privacy-policy")}
            />
            <SettingInfoRow
              label="앱 버전"
              icon={<Info size={18} color={semantic.body} />}
              divider
              // 하드코딩 mock은 행의 의미 자체를 거짓으로 만든다 — 빌드 주입값 (결정 Q4)
              value={Constants.expoConfig?.version ?? "1.0.0"}
            />
            <SettingRow
              label="계정 삭제"
              tone="danger"
              icon={<Trash2 size={18} color={semantic.error} />}
              onPress={() => setDeleteOpen(true)}
            />
          </SettingGroup>

          {/* 로그아웃 (기준 11) — 파괴적 스타일은 계정 삭제에만 남기고 여기는 회색 텍스트 링크 */}
          <Pressable
            accessibilityRole="button"
            onPress={() => setLogoutOpen(true)}
            className="items-center py-sm active:opacity-60"
          >
            <Text className="text-fm-body text-foreground-muted">로그아웃</Text>
          </Pressable>
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
        onCancel={closeLogoutModal}
        onOverlayPress={closeLogoutModal}
        onConfirm={() => logout.mutate()}
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
