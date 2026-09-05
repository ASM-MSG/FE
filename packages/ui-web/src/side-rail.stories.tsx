import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Calendar,
  Compass,
  Home,
  LayoutGrid,
  LogOut,
  MapPin,
  Upload,
  User,
} from "lucide-react";
import { SideRail } from "./side-rail";

const items = [
  { key: "home", label: "홈", icon: <Home className="size-5.5" /> },
  { key: "explore", label: "탐색", icon: <Compass className="size-5.5" /> },
  { key: "upload", label: "업로드", icon: <Upload className="size-5.5" /> },
  { key: "dex", label: "도감", icon: <LayoutGrid className="size-5.5" /> },
  { key: "profile", label: "프로필", icon: <User className="size-5.5" /> },
];

const meta = {
  title: "Components/SideRail",
  component: SideRail,
  args: {
    items,
    activeKey: "home",
    logo: (
      <span className="flex size-full items-center justify-center bg-primary text-primary-foreground">
        <MapPin className="size-5" />
      </span>
    ),
  },
  argTypes: {
    activeKey: { control: "select", options: items.map((i) => i.key) },
  },
} satisfies Meta<typeof SideRail>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 레일은 전고 컨테이너에서만 의미가 있다 — 스토리 공통 배치 */
const renderInFullHeight: Story["render"] = (args) => (
  <div className="flex h-150 bg-surface">
    <SideRail {...args} />
  </div>
);

export const Playground: Story = {
  render: renderInFullHeight,
};

/**
 * 하단 슬롯(footer) — 콘솔 레일(MSG-541)의 로그아웃 자리. 항목 목록 아래 남은 공간을
 * 밀어내고 바닥에 붙는다. footer를 넘기지 않으면 Playground와 동일한 렌더다.
 */
export const WithFooter: Story = {
  args: {
    items: [
      { key: "home", label: "홈", icon: <Home className="size-5.5" /> },
      { key: "events", label: "행사", icon: <Calendar className="size-5.5" /> },
    ],
    activeKey: "home",
    footer: (
      <button
        type="button"
        className="flex size-14 flex-col items-center justify-center gap-xxs rounded-md text-foreground-body"
      >
        <LogOut className="size-5.5" />
        <span className="text-fm-caption font-medium">로그아웃</span>
      </button>
    ),
  },
  render: renderInFullHeight,
};
