import { Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";

/**
 * SOURCE: Figma 온보딩 v2 · 1 — 채우기 (node 14875:430) 히어로.
 * 실 지도·실 데이터가 아닌 **연출용 정적 일러스트**다 (스펙 A2) — 지도 SDK·API를 붙이지 않는다.
 *
 * 격자 칸은 `GridCell`이 아니라 평범한 `View`로 그린다(재작업 1회차) — `GridCell`은 Pressable +
 * `accessibilityRole="button"` 내장이라 탭 동작이 없는 장식이 스크린리더에 **이름 없는 버튼 8개**로
 * 노출됐다(기준 S11 위반, `uiautomator dump` 재현). 채움 클래스는 `GridCell`의 상태 클래스와 같은
 * 값을 쓰되(강조 칸만 Figma 55% 채움), 접근성 노드를 애초에 만들지 않는다.
 *
 * 남는 장식 텍스트는 일러스트 래퍼의 `accessible` + `accessibilityLabel` 그룹핑으로 덮는다 —
 * `importantForAccessibility`("no"·"no-hide-descendants")는 이 스택(RN 0.86.2 Fabric)에서
 * **완전히 무시된다**는 것을 실기 대조 실험으로 확인했다(같은 프롭을 일반 텍스트 행에 걸어도
 * 트리에서 사라지지 않음). 카드 하단 meta 행은 그룹 밖이라 그대로 낭독된다.
 */

/** 미니맵 한 칸의 채움 상태 — null은 빈 격자(점선 라인만) */
type MiniMapCell = "collected" | "just-filled" | null;

/** 칸 채움 클래스 — collected는 ui-native GridCell의 collected 상태와 동일 값 */
const CELL_CLASS: Record<NonNullable<MiniMapCell>, string> = {
  collected: "border border-primary/60 bg-primary/40",
  "just-filled": "border-2 border-primary bg-primary/60",
};

/**
 * Figma 실측 배치 근사 — 채운 칸 7개 + 방금 채운 칸 1개.
 * 3행 × 60px = 180px가 카드 미니맵 영역의 실제 높이다(재작업 1회차: 4행 정의 중 마지막 행이
 * `h-42` 클리핑으로 영영 보이지 않아, 정의한 칸이 전부 보이도록 3행으로 맞췄다).
 */
const MINI_MAP_ROWS: readonly (readonly MiniMapCell[])[] = [
  [null, "collected", "collected", null, null],
  ["collected", null, "just-filled", "collected", null],
  [null, "collected", null, "collected", "collected"],
];

export const FillHeroCard = () => (
  <View className="rounded-xl bg-primary/5 p-md">
    <View className="overflow-hidden rounded-lg border border-border bg-background shadow-raised">
      <View className="overflow-hidden bg-primary/10">
        {/* 일러스트 전체를 접근성 요소 1개로 묶는다 — 안의 격자·도로 띠·"+1 격자" 배지는
            개별 낭독되지 않고 이 라벨만 낭독된다(재작업 1회차 실기 확인) */}
        <View
          accessible
          accessibilityLabel="격자를 채워가는 동네 지도 일러스트"
        >
          {/* 흰 도로 띠 2줄 */}
          <View className="absolute -left-10 top-10 h-6 w-96 rotate-12 bg-background/70" />
          <View className="absolute -left-10 top-28 h-3 w-96 rotate-12 bg-background/50" />
          {MINI_MAP_ROWS.map((row, rowIndex) => (
            <View key={rowIndex} className="flex-row">
              {row.map((cell, columnIndex) => (
                <View
                  key={columnIndex}
                  className={cx(
                    "size-15",
                    cell
                      ? CELL_CLASS[cell]
                      : "border border-dashed border-primary/20",
                  )}
                >
                  {cell === "just-filled" && (
                    <View className="absolute -top-3 right-0 rounded-full bg-primary px-2 py-0.5 shadow-raised">
                      <Text className="text-fm-caption text-primary-foreground">
                        +1 격자
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      </View>
      <View className="flex-row items-center gap-sm p-sm">
        <View className="flex-1 gap-0.5">
          <Text className="text-fm-title text-foreground">서면 A-14 채움!</Text>
          <Text className="text-fm-label text-foreground-muted">
            부산진구 12 / 64 격자
          </Text>
        </View>
        <View className="size-11 items-center justify-center rounded-full bg-primary/10">
          <Text className="text-fm-label text-primary">19%</Text>
        </View>
      </View>
    </View>
  </View>
);
