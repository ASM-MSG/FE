import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { SearchBar } from "./search-bar";

const meta = {
  title: "Components/SearchBar",
  component: SearchBar,
  args: {
    placeholder: "장소, 격자, 영상 검색",
  },
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 장식 아이콘/검색 버튼(onSearch)/값 입력 상태 */
export const AllStates: Story = {
  render: () => (
    <View className="gap-md">
      <SearchBar placeholder="장소, 격자, 영상 검색" />
      <SearchBar placeholder="장소, 격자, 영상 검색" onSearch={() => {}} />
      <SearchBar defaultValue="전포 카페거리" onSearch={() => {}} />
    </View>
  ),
};

/** 테마 검색어 바 (MSG-298) — 좌측 뒤로가기(onBack) + 우측 지우기(onClear), 표시 전용 */
export const ThemeQuery: Story = {
  render: () => (
    <SearchBar
      value="핫구역"
      editable={false}
      onBack={() => {}}
      onClear={() => {}}
    />
  ),
};
