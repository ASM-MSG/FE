import { View } from "react-native";
import { Flame, PartyPopper, Route, Store } from "lucide-react-native";
import { palette } from "@fillmap/design-tokens";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Chip } from "./chip";

const meta = {
  title: "Components/Chip",
  component: Chip,
  args: {
    text: "부산진구",
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 기본/활성/비활성 — 지도 홈 카테고리 칩 구성 */
export const AllStates: Story = {
  render: () => (
    <View className="flex-row flex-wrap items-center gap-xs">
      <Chip text="전포 카페거리" />
      <Chip text="서면 1번가" active />
      <Chip text="부전시장" disabled />
    </View>
  ),
};

/**
 * 리딩 아이콘 슬롯 (MSG-294 AC 20) — 지도 홈 카테고리 칩 매핑.
 * RN은 currentColor 상속이 없어 아이콘 색을 호출부가 테마 토큰 값으로 전달한다.
 */
export const WithIcon: Story = {
  render: () => (
    <View className="flex-row flex-wrap items-center gap-xs">
      <Chip
        text="핫구역"
        icon={<Flame size={14} color={palette["theme-hot"]} />}
      />
      <Chip
        text="지역축제"
        icon={<PartyPopper size={14} color={palette["theme-festival"]} />}
      />
      <Chip
        text="팝업스토어"
        icon={<Store size={14} color={palette["theme-popup"]} />}
      />
      <Chip
        text="경로추천"
        icon={<Route size={14} color={palette["theme-route"]} />}
      />
    </View>
  ),
};
