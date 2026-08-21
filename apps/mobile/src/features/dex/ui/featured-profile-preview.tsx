import { Text, View } from "react-native";
import { User } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { Avatar } from "@fillmap/ui-native";

interface FeaturedProfilePreviewProps {
  /** 닉네임 — `GET /api/users/me` */
  nickname: string;
  /** 프로필 이미지 URL — null이면 사람 실루엣 기본 이미지 (프로필 화면과 같은 폴백) */
  profileImageUrl: string | null;
  /** 선택된 뱃지(id·이름) — 순번 순. 빈 배열이면 pill 행을 렌더하지 않는다 (S5) */
  badges: { id: number; name: string }[];
}

/**
 * SOURCE: Figma "대표 뱃지 지정"(node 14799:25586) 하단 카드 — MSG-430 S5.
 * 편집 모드 "프로필 미리보기" — 아바타(md=36px) + 닉네임 + 선택 뱃지 이름 pill(순번 순).
 * 선택 변경 시 부모가 넘기는 badges로 즉시 갱신된다 — 서버 왕복도, 캐시 낙관도 아니다.
 *
 * 카드 배경 `#f0f6ff`는 primary 5% 틴트와 동치라 `bg-primary/5`로 표현한다(임의 hex 금지).
 * pill은 웹 `FeaturedBadgePills`의 시각 미러다 — 도감 편집 1곳만 쓰므로 로컬로 둔다.
 */
export const FeaturedProfilePreview = ({
  nickname,
  profileImageUrl,
  badges,
}: FeaturedProfilePreviewProps) => (
  <View className="gap-xs">
    <Text className="text-fm-body-strong text-foreground">프로필 미리보기</Text>
    <View className="flex-row items-center gap-sm rounded-md bg-primary/5 px-md py-3.5">
      <Avatar
        size="md"
        src={profileImageUrl ?? undefined}
        alt={nickname}
        fallbackIcon={<User size={20} color={semantic.muted} />}
      />
      <View className="min-w-0 flex-1 gap-xxs">
        <Text className="text-fm-body-strong text-foreground" numberOfLines={1}>
          {nickname}
        </Text>
        {badges.length > 0 && (
          <View className="flex-row flex-wrap gap-xxs">
            {badges.map((badge) => (
              <View
                key={badge.id}
                className="rounded-full border border-primary bg-background px-xs py-0.5"
              >
                <Text className="text-fm-caption text-primary">
                  {badge.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  </View>
);
