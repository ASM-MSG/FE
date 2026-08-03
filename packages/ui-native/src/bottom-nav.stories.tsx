import { useState } from "react";
import { BookImage, Map as MapIcon, Search, User } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import type { Meta, StoryObj } from "@storybook/react-native";
import { BottomNav } from "./bottom-nav";

/** RN은 아이콘 색 상속이 없어 activeKey에 맞춰 아이콘 색을 직접 지정한다 */
const buildItems = (activeKey: string) => {
  const color = (key: string) =>
    key === activeKey ? semantic.primary : semantic.muted;
  return [
    {
      key: "map",
      label: "지도",
      icon: <MapIcon size={22} color={color("map")} />,
    },
    {
      key: "search",
      label: "검색",
      icon: <Search size={22} color={color("search")} />,
    },
    {
      key: "dex",
      label: "도감",
      icon: <BookImage size={22} color={color("dex")} />,
    },
    {
      key: "profile",
      label: "프로필",
      icon: <User size={22} color={color("profile")} />,
    },
  ];
};

const BottomNavDemo = () => {
  const [active, setActive] = useState("map");
  return (
    <BottomNav
      items={buildItems(active)}
      activeKey={active}
      onSelect={setActive}
      onCamera={() => {}}
    />
  );
};

const meta = {
  title: "Components/BottomNav",
  component: BottomNav,
  args: {
    items: buildItems("map"),
    activeKey: "map",
  },
} satisfies Meta<typeof BottomNav>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 탭 전환 인터랙션 데모 (중앙 볼록 카메라 버튼 포함) */
export const Interactive: Story = {
  render: () => <BottomNavDemo />,
};
