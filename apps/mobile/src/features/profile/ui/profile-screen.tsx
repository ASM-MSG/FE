import { useState, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { AppHeader, Avatar, Button, ModalCard } from "@fillmap/ui-native";
import { avatarFallback } from "../../../entities/profile/model/avatar-fallback";
import { MOCK_PROFILE } from "../../../entities/profile/model/mock-profile";
import { AppBottomNav } from "../../../widgets/bottom-nav/app-bottom-nav";
import { formatJoinedDate } from "../model/profile-format";
import { useProfile } from "../model/profile-store";

/** 섹션 블록 — 제목 + 내용 (웹 ProfileSection 미러, 제목 스타일은 도감 "내 도감" 선례) */
const ProfileSection = ({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) => (
  <View className="gap-sm">
    <Text className="text-fm-title text-foreground">{title}</Text>
    {children}
  </View>
);

/** 행 카드 공통 스타일 — 도감 방문 기록 행 선례 (rounded-md·border·surface-soft) */
const rowClassName =
  "flex-row items-center gap-sm rounded-md border border-border bg-surface-soft px-md py-sm";

/**
 * › 행 (AC 5·7) — 상세 이동은 제외 범위라 렌더만. 탭 무동작이므로 button 역할을
 * 부여하지 않는다 (도감 "스트릭 전체 기록 보기" 선례). 우측 "sm" 텍스트는 Figma
 * 아이콘 자리 플레이스홀더 → ChevronRight (티켓 확정).
 */
const SettingRow = ({ label }: { label: string }) => (
  <View className={rowClassName}>
    <Text className="flex-1 text-fm-body text-foreground" numberOfLines={1}>
      {label}
    </Text>
    <ChevronRight size={16} color={semantic.muted} />
  </View>
);

/** 정보 행 (AC 6) — 우측에 값 텍스트만, › 없음 (앱 버전 행 전용, 웹 SettingInfoRow 미러) */
const SettingInfoRow = ({ label, value }: { label: string; value: string }) => (
  <View className={rowClassName}>
    <Text className="flex-1 text-fm-body text-foreground" numberOfLines={1}>
      {label}
    </Text>
    <Text className="text-fm-body text-foreground-muted">{value}</Text>
  </View>
);

/** 내 활동 스탯 1칸 (AC 4) — 라벨(캡션) 위, 값(타이틀) 아래 (도감 StatItem 선례) */
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

/**
 * SOURCE: Figma "프로필/설정" (node 14094:4469) — MSG-306.
 * 프로필 카드(아바타·닉네임·가입일·이메일·[편집]) + 내 활동 + 설정 + 계정 + [로그아웃]
 * + 로그아웃 확인 모달(표시까지만) + AppBottomNav. 전부 mock — API 연동 제외 범위.
 * 닉네임·위치정보는 profile-store 구독 — 편집 저장이 카드에 반영된다 (AC 13).
 * Figma의 "닉네임"·"가입일 · 이메일 :"·"서울 34%"·"Aa"·"sm"은 전부 플레이스홀더
 * (스펙 오탐 방지 목록) — 실표시는 mock 값·ChevronRight·이니셜 "필".
 */
export const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { nickname } = useProfile();
  const [logoutOpen, setLogoutOpen] = useState(false);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <AppHeader title="프로필/설정" />
      <ScrollView className="flex-1">
        <View className="gap-lg px-5 pb-lg pt-md">
          {/* 프로필 카드 (AC 2·8) — 아바타 이니셜 폴백 + [편집]은 편집 페이지 이동 */}
          <View className={rowClassName}>
            <Avatar
              size="lg"
              alt={nickname}
              fallback={avatarFallback(nickname)}
            />
            <View className="min-w-0 flex-1 gap-xxs">
              <Text className="text-fm-title text-foreground" numberOfLines={1}>
                {nickname}
              </Text>
              <Text
                className="text-fm-body text-foreground-muted"
                numberOfLines={1}
              >
                가입일 {formatJoinedDate(MOCK_PROFILE.joinedAt)} ·{" "}
                {MOCK_PROFILE.email}
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

          {/* 내 활동 (AC 4) — 좌측 스트릭 · 우측 수집률 ("부산 34%", 서울 금지) */}
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

          {/* 설정 (AC 5·7) — › 행 3개, 상세 이동은 제외 범위(렌더만) */}
          <ProfileSection title="설정">
            <SettingRow label="위치정보 동의 관리" />
            <SettingRow label="알림 설정" />
            <SettingRow label="신고 관리" />
          </ProfileSection>

          {/* 계정 (AC 6·7) — 앱 버전은 정보 행(› 없음), 나머지는 › 행 */}
          <ProfileSection title="계정">
            <SettingInfoRow label="앱 버전" value={MOCK_PROFILE.appVersion} />
            <SettingRow label="서비스 이용약관" />
            <SettingRow label="개인정보 처리방침" />
          </ProfileSection>

          {/* [로그아웃] (AC 9) — 좌측 컴팩트 red pill (승인 추정 6), 모달 표시까지만 */}
          <Button
            text="로그아웃"
            variant="danger"
            size="sm"
            shape="pill"
            className="self-start"
            onPress={() => setLogoutOpen(true)}
          />
        </View>
      </ScrollView>
      <AppBottomNav />

      {/* 로그아웃 확인 모달 (AC 17·18) — [취소]·딤 탭은 닫기, [로그아웃] 확인 버튼은
          미배선(onConfirm 미지정 → 탭 무동작) — 실제 로그아웃은 후속 티켓 (승인 추정 5) */}
      <ModalCard
        visible={logoutOpen}
        title="로그아웃"
        description="정말 로그아웃하시겠습니까?"
        cancelText="취소"
        confirmText="로그아웃"
        confirmVariant="danger"
        onCancel={() => setLogoutOpen(false)}
        onOverlayPress={() => setLogoutOpen(false)}
      />
    </View>
  );
};
