import { View } from "react-native";
import {
  Award,
  Bell,
  CalendarDays,
  Flame,
  PartyPopper,
  ShieldAlert,
  UserPlus,
  Video,
  type LucideIcon,
} from "lucide-react-native";
import { palette, semantic } from "@fillmap/design-tokens";
import { cx } from "@fillmap/ui-native";
import type { InboxCategory } from "../model/inbox";

interface CategoryVisual {
  Icon: LucideIcon;
  color: string;
  /** NativeWind는 정적 클래스만 잡는다 — 알파 배경을 문자열 그대로 둔다 */
  bgClass: string;
}

/**
 * 카테고리 → 아이콘·색 (MSG-602 디자인 결정, 시안 없음). 테마 칩(핫구역·축제·팝업·경로)과
 * 같은 팔레트를 재사용해 지도 홈과 색 언어를 맞춘다. 모르는 카테고리는 종 아이콘·primary.
 */
const VISUALS: Partial<Record<InboxCategory, CategoryVisual>> = {
  BADGE: { Icon: Award, color: semantic.primary, bgClass: "bg-primary/10" },
  HOTZONE: {
    Icon: Flame,
    color: palette["theme-hot"],
    bgClass: "bg-theme-hot/10",
  },
  REMIND: {
    Icon: Bell,
    color: palette["theme-popup"],
    bgClass: "bg-theme-popup/10",
  },
  VIDEO: { Icon: Video, color: semantic.primary, bgClass: "bg-primary/10" },
  WEEKLY: {
    Icon: CalendarDays,
    color: palette["theme-route"],
    bgClass: "bg-theme-route/10",
  },
  FRIEND: {
    Icon: UserPlus,
    color: palette["theme-festival"],
    bgClass: "bg-theme-festival/10",
  },
  MODERATION: {
    Icon: ShieldAlert,
    color: semantic.error,
    bgClass: "bg-error/10",
  },
  EVENT: {
    Icon: PartyPopper,
    color: palette["theme-festival"],
    bgClass: "bg-theme-festival/10",
  },
};

const FALLBACK: CategoryVisual = {
  Icon: Bell,
  color: semantic.primary,
  bgClass: "bg-primary/10",
};

export const NotificationCategoryIcon = ({
  category,
}: {
  category: string;
}) => {
  const { Icon, color, bgClass } =
    VISUALS[category as InboxCategory] ?? FALLBACK;
  return (
    <View
      className={cx(
        "size-10 items-center justify-center rounded-full",
        bgClass,
      )}
    >
      <Icon size={20} color={color} />
    </View>
  );
};
