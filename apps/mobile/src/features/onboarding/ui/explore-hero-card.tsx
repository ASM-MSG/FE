import { Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";
import { THEME_META, type ThemeId } from "../../map-home/model/themes";

/**
 * SOURCE: Figma 온보딩 v2 · 3 — 탐험 (node 14875:454) 히어로.
 * 연출용 정적 일러스트 (스펙 A2). 칩 라벨·미션 이름표는 Figma 원문이 아니라 **앱 정본**을 쓴다
 * (사용자 승인 Q4·Q5) — `팝업스토어`(THEME_META 라벨), `부산불꽃축제`(MVP 지역 = 부산 서면).
 *
 * 테마 칩은 `Chip`이 아니라 평범한 `View`로 그린다(재작업 1회차) — `Chip`은 Pressable +
 * `accessibilityRole="button"` 내장이라 탭 동작이 없는 장식이 스크린리더에 **이름 있는 버튼 3개**로
 * 노출됐다(기준 S11 위반, `uiautomator dump` 재현). 라벨은 여전히 `THEME_META` 정본을 쓰고,
 * 활성 칩이 테마 원색이라 Chip 기본 배색(bg-primary)을 덮을 필요도 사라졌다.
 *
 * 장식 텍스트(칩 라벨·미션 이름표·메달 숫자)는 `accessible` + `accessibilityLabel` 그룹핑으로
 * 덮는다 — `importantForAccessibility`는 이 스택(RN 0.86.2 Fabric)에서 무시된다(fill-hero-card
 * JSDoc의 실기 대조 실험 참조). 낭독은 일러스트 1개 + 보상 행 1개, 총 2개 요소로 정리된다.
 */

/** 칩 3종 — 활성은 핫구역 하나뿐 */
const CHIP_THEMES: readonly ThemeId[] = ["hot", "festival", "popup"];

/** 테마 원색 도트·활성 칩 배경 클래스 (원시 토큰 — 시맨틱 미표현, themes.ts 선례) */
const THEME_DOT_CLASS: Record<ThemeId, string> = {
  hot: "bg-theme-hot",
  festival: "bg-theme-festival",
  popup: "bg-theme-popup",
  route: "bg-theme-route",
};

/** Figma 실측 배치 근사 — 빨강 3칸 · 보라 2칸 · 파랑 1칸 */
const THEME_MAP_ROWS: readonly (readonly (string | null)[])[] = [
  [null, "bg-theme-hot/30", "bg-theme-hot/40", null, null],
  [null, null, "bg-theme-hot/25", "bg-theme-festival/30", null],
  [null, null, null, "bg-theme-festival/20", null],
  ["bg-primary/30", null, null, null, null],
];

export const ExploreHeroCard = () => (
  <View className="rounded-xl bg-primary/5 p-md">
    <View className="gap-sm rounded-lg border border-border bg-background p-sm shadow-raised">
      {/* 일러스트 전체를 접근성 요소 1개로 묶는다 — 안의 칩·격자·이름표는 개별 낭독되지 않고
          이 라벨만 낭독된다(재작업 1회차의 실기 확인 결과 이 스택에서 유일하게 듣는 수단) */}
      <View
        accessible
        accessibilityLabel="테마별 격자 지도 일러스트"
        className="gap-sm"
      >
        <View className="flex-row items-center gap-xxs">
          {CHIP_THEMES.map((id, index) => {
            const active = index === 0;
            return (
              <View
                key={id}
                className={cx(
                  "h-8 flex-row items-center gap-xxs rounded-full px-3.5",
                  active
                    ? "bg-theme-hot"
                    : "border border-border bg-background",
                )}
              >
                <View
                  className={cx(
                    "size-1.5 rounded-full",
                    active ? "bg-background" : THEME_DOT_CLASS[id],
                  )}
                />
                <Text
                  className={cx(
                    "text-fm-label",
                    active ? "text-primary-foreground" : "text-foreground",
                  )}
                >
                  {THEME_META[id].label}
                </Text>
              </View>
            );
          })}
        </View>
        <View className="overflow-hidden rounded-md bg-primary/10">
          {THEME_MAP_ROWS.map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row">
              {row.map((fillClass, columnIndex) => (
                <View
                  key={columnIndex}
                  className={cx(
                    "size-13 border border-dashed border-primary/20",
                    fillClass,
                  )}
                />
              ))}
            </View>
          ))}
          <View className="absolute right-1 top-14 flex-row items-center gap-xxs rounded-full bg-background px-2 py-1 shadow-raised">
            <View className="size-1.5 rounded-full bg-theme-festival" />
            <Text className="text-fm-caption text-foreground">
              부산불꽃축제
            </Text>
          </View>
        </View>
      </View>
      {/* 보상 행도 요소 1개로 묶는다 — 장식인 메달 숫자("3")가 따로 낭독되지 않고
          두 줄이 한 문장으로 낭독된다 */}
      <View
        accessible
        accessibilityLabel="미션 1칸 채우면 완료, 뱃지는 도감에 기록돼요"
        className="flex-row items-center gap-sm rounded-lg border border-border bg-surface-soft p-sm"
      >
        <View className="size-9 items-center justify-center rounded-full bg-theme-popup">
          <Text className="text-fm-body-strong text-primary-foreground">3</Text>
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-fm-body-strong text-foreground">
            미션 1칸 채우면 완료
          </Text>
          <Text className="text-fm-caption text-foreground-muted">
            뱃지 · 도감에 기록돼요
          </Text>
        </View>
      </View>
    </View>
  </View>
);
