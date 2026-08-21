import { Text, View } from "react-native";

/**
 * 미션·코스 상세의 분할 스탯 행 (MSG-427 D11·E5) — Figma 실측: 회색 박스
 * (`#FAFAFC` = `bg-surface-soft`) 3분할, **라벨 위 / 값 아래**.
 *
 * `ui-native/StatTile`을 쓰지 않는 이유: StatTile은 값(`fm-display` 20/600) → 라벨
 * (`fm-label`) **순서가 하드코딩**이고 `className`은 컨테이너에만 붙는데(RN에는 View→Text
 * 스타일 상속이 없다), 여기가 요구하는 것은 순서 반전 + 값 타이포(`fm-body-strong` 13/600)
 * + 3분할 `bg-surface-soft` 박스라 겹치는 부분이 라벨·값 두 문자열뿐이다.
 * `stat-tile.tsx`에 옵셔널 prop을 더하는 것 자체는 `index.ts`를 건드리지 않지만
 * (MSG-421 `video-card.tsx` 선례), 이 정도를 prop으로 흡수하면 StatTile이 배치·타이포·
 * 컨테이너가 다른 **두 얼굴**이 된다 — 웹도 같은 이유로 로컬 `StatTrio`를 갖는다.
 * 승격 후보로 빌드 리포트에 남긴다.
 *
 * 값이 없는 칸(거리·소요시간 미제공)은 **호출부가 걸러서 넘긴다** — `-`나 `0분`으로
 * 채우면 없는 사실을 주장하게 된다 (E6).
 */
export interface StatItem {
  label: string;
  value: string;
}

interface StatTrioProps {
  items: StatItem[];
}

export const StatTrio = ({ items }: StatTrioProps) => (
  <View className="flex-row gap-xs">
    {items.map((item) => (
      <View
        key={item.label}
        className="flex-1 items-center justify-center gap-0.5 rounded-sm bg-surface-soft px-xxs py-xs"
      >
        <Text className="text-fm-caption text-foreground-muted">
          {item.label}
        </Text>
        <Text className="text-center text-fm-body-strong text-foreground">
          {item.value}
        </Text>
      </View>
    ))}
  </View>
);
