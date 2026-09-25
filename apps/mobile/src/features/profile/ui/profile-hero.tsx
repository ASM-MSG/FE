import { Pressable, Text, View } from "react-native";
import { Pencil, User } from "lucide-react-native";
import { palette, semantic } from "@fillmap/design-tokens";
import { Avatar } from "@fillmap/ui-native";

interface ProfileHeroProps {
  nickname: string;
  profileImageUrl: string | null;
  /** "2026.09.25 가입 · 1일째 함께" — 조회 전에는 "프로필을 불러오는 중" */
  metaText: string;
  /** 대표 뱃지(순번 순) — 빈 배열이면 pill 행을 그리지 않는다 */
  badges: { id: number; name: string }[];
  onEdit: () => void;
}

/**
 * SOURCE: Figma "제안 — 프로필/설정 리디자인" hero-card (node 16182:359, 2026-09-25).
 * 흰 카드 가운데 정렬 — 아바타 72 + 연파랑 링 + 우하단 편집 배지(→ 편집 화면), 닉네임, 가입 메타 한 줄,
 * 대표 뱃지 pill(도감 `FeaturedProfilePreview` pill과 같은 시각). 이메일은 표시하지 않는다(릴레이 주소라
 * 정보 가치가 없고 카드를 늘어뜨렸다).
 */
export const ProfileHero = ({
  nickname,
  profileImageUrl,
  metaText,
  badges,
  onEdit,
}: ProfileHeroProps) => (
  <View className="items-center gap-xs rounded-xl bg-white px-md pb-md pt-lg shadow-raised">
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="프로필 편집"
      onPress={onEdit}
      className="items-center justify-center rounded-full bg-primary/10 p-1 active:opacity-80"
    >
      <Avatar
        size="lg"
        className="size-18"
        src={profileImageUrl ?? undefined}
        alt={nickname}
        fallbackIcon={<User size={34} color={semantic.muted} />}
      />
      <View className="absolute bottom-0 right-0 size-7 items-center justify-center rounded-full border-2 border-white bg-primary">
        <Pencil size={12} color={palette.white} strokeWidth={2.5} />
      </View>
    </Pressable>
    <Text className="mt-xxs text-fm-display text-foreground" numberOfLines={1}>
      {nickname}
    </Text>
    <Text className="text-fm-caption text-foreground-muted">{metaText}</Text>
    {badges.length > 0 && (
      <View className="mt-xxs flex-row flex-wrap justify-center gap-xxs">
        {badges.map((badge) => (
          <View key={badge.id} className="rounded-full bg-surface px-sm py-1">
            <Text className="text-fm-caption font-semibold text-foreground-body">
              {badge.name}
            </Text>
          </View>
        ))}
      </View>
    )}
  </View>
);
