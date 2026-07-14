import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchBar } from "./search-bar";

const meta = {
  title: "Components/SearchBar",
  component: SearchBar,
  args: { placeholder: "장소, 격자, 영상 검색" },
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** focused 상태는 입력창 클릭으로 확인 */
export const Playground: Story = {
  render: (args) => (
    <div className="w-[356px] bg-surface p-md">
      <SearchBar {...args} />
    </div>
  ),
};
