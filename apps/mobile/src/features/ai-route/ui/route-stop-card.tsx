import { Pressable, Text, View } from "react-native";
import { cx } from "@fillmap/ui-native";
import type { RoutePointDto } from "../../../shared/api/sdk";
import {
  kindTag,
  stopMetaLine,
  type RouteKindTone,
} from "../model/route-point-view";

/**
 * 추천 지점 카드 (Figma 15751:448) — 순번 뱃지 · 이름 · kind 태그 · 표시명 · reason.
 * 도메인(추천 지점) 컴포넌트라 ui-native 승격 대상이 아니다(규칙 3).
 * 태그 색은 tone(의미) → 토큰 클래스 **리터럴 표**다 — tailwind 정적 스캔 (§6).
 * 선택 강조는 웹 ring-2 대응 — RN에 ring이 없어 border로 그리고, 미선택도 투명 border를
 * 유지해 레이아웃이 흔들리지 않게 한다 (S15).
 */
const TONE_CLASS: Record<RouteKindTone, { badge: string; text: string }> = {
  place: { badge: "bg-primary/10", text: "text-primary" },
  festival: { badge: "bg-theme-festival/10", text: "text-theme-festival" },
  popup: { badge: "bg-theme-popup/10", text: "text-theme-popup" },
  route: { badge: "bg-theme-route/10", text: "text-theme-route" },
};

interface RouteStopCardProps {
  point: RoutePointDto;
  selected: boolean;
  onSelect: () => void;
}

export const RouteStopCard = ({
  point,
  selected,
  onSelect,
}: RouteStopCardProps) => {
  const tag = kindTag(point.kind);
  const meta = stopMetaLine(point);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={point.name}
      accessibilityState={{ selected }}
      onPress={onSelect}
      className={cx(
        "flex-row items-start gap-sm rounded-md border-2 bg-surface-soft p-sm active:opacity-80",
        selected ? "border-theme-route" : "border-transparent",
      )}
    >
      <View className="size-7 shrink-0 items-center justify-center rounded-full border-2 border-background bg-theme-route shadow-raised">
        <Text className="text-fm-body-strong text-primary-foreground">
          {point.order}
        </Text>
      </View>
      <View className="flex-1 gap-0.5">
        <View className="flex-row items-center gap-xs">
          <Text
            numberOfLines={1}
            className="shrink text-fm-title text-foreground"
          >
            {point.name}
          </Text>
          {tag && (
            <View
              className={cx(
                "shrink-0 rounded-full px-1.5 py-px",
                TONE_CLASS[tag.tone].badge,
              )}
            >
              <Text
                className={cx("text-fm-caption", TONE_CLASS[tag.tone].text)}
              >
                {tag.label}
              </Text>
            </View>
          )}
        </View>
        {meta && (
          <Text className="text-fm-label text-foreground-muted">{meta}</Text>
        )}
        <Text className="text-fm-body text-foreground-body">
          {point.reason}
        </Text>
      </View>
    </Pressable>
  );
};
