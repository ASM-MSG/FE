import { Pressable, Text, View } from "react-native";
import { BadgeArtView } from "../../../entities/badge/ui/badge-art-view";
import type { DexBadge } from "../../../entities/dex/model/dex";

/** 메달 지름 56px — 시안 메달 148px을 진열장 4열에 맞춰 축소한 값(웹 size-14 미러) */
const MEDAL_SIZE = 56;

interface BadgeMedalProps {
  badge: DexBadge;
  /**
   * 편집 모드 선택 표시 (S4) — 지정하면 **획득** 뱃지가 토글 버튼이 된다:
   * 선택 = primary 링 + 우상단 순번 칩(1·2), 미선택 = 우상단 빈 원형 마크.
   * 미획득 뱃지는 편집 모드에서도 표시 전용이다(Pressable 미렌더 = 탭 no-op).
   * 생략하면 기존 표시 전용 경로 그대로다.
   */
  editing?: {
    /** 선택 순번(1·2) — 미선택이면 null (featuredRankOf 결과) */
    rank: number | null;
    /** 선택 토글 콜백 */
    onToggle: () => void;
  };
}

/**
 * SOURCE: Figma "개인 도감 — 뱃지 탭"(node 14799:26410) · 편집 모드(14799:25586) — MSG-430 S1·S4.
 * 뱃지 메달 1개 — 56px 메달 아트 + 하단 이름. 웹 `pages/dex/ui/BadgeMedal.tsx` 미러.
 *
 * 웹과의 의도된 차이 2가지(승인 A1·A2):
 * - **이름**: 웹은 미획득에 "미획득"을 쓰지만(스포일러 방지) 모바일 시안·티켓은 실제 이름을
 *   그리므로 획득 여부와 무관하게 이름을 표시한다.
 * - **잠금 표현**: 웹은 `grayscale-100 opacity-40`인데 RN에는 크로스버전 안전한 grayscale이
 *   없다(Android는 API 31+ RenderEffect 의존, 이 앱 minSdk는 24). 40% 투명 단독으로 눌러
 *   구분하고 라벨을 `text-foreground-muted`로 낮춘다.
 *
 * 아트 소스·렌더 4분기(`SvgXml`/`SvgUri`/`Image`/민무늬 원)는 `entities/badge/ui/BadgeArtView`가
 * 소유한다(MSG-617 D2) — 뱃지 획득 모달과 같은 아트·같은 폴백 규칙(MSG-430 F1 포함)을 한 곳에서
 * 보장한다. 여기는 56px 치수·이름 캡션·미획득 투명·편집 선택 표시만 담당한다.
 */
export const BadgeMedal = ({ badge, editing }: BadgeMedalProps) => {
  const medal = (
    <BadgeArtView
      code={badge.code}
      iconUrl={badge.iconUrl}
      size={MEDAL_SIZE}
      locked={!badge.earned}
    />
  );

  const label = (
    <Text
      className={`text-center text-fm-caption ${
        badge.earned ? "text-foreground" : "text-foreground-muted"
      }`}
    >
      {badge.name}
    </Text>
  );

  // 미획득은 메달·라벨 통째로 눌러 구분한다 (승인 A2)
  const body = (
    <View
      className="items-center gap-xxs"
      style={badge.earned ? undefined : { opacity: 0.4 }}
    >
      <View className="relative">
        {medal}
        {editing !== undefined &&
          badge.earned &&
          (editing.rank !== null ? (
            <>
              {/* primary 링 — 메달보다 4px 크게 (Figma featured-ring 64px) */}
              <View className="absolute -inset-1 rounded-full border-2 border-primary" />
              <View className="absolute -top-1 -right-1.5 size-5 items-center justify-center rounded-full border-2 border-background bg-primary">
                <Text className="text-fm-caption text-primary-foreground">
                  {editing.rank}
                </Text>
              </View>
            </>
          ) : (
            // 미선택 획득 — 우상단 빈 원형 마크 (Figma select-mark)
            <View className="absolute -top-1 -right-1.5 size-5 rounded-full border border-border bg-background" />
          ))}
      </View>
      {label}
    </View>
  );

  if (editing !== undefined && badge.earned) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: editing.rank !== null }}
        accessibilityLabel={
          editing.rank !== null
            ? `${badge.name}, 대표 뱃지 ${editing.rank}순위로 선택됨`
            : badge.name
        }
        onPress={editing.onToggle}
      >
        {body}
      </Pressable>
    );
  }

  return body;
};
