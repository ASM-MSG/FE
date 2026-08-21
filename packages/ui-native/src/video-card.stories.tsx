import { Text, View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { CellBadge } from "./cell-badge";
import { VideoCard } from "./video-card";

const meta = {
  title: "Components/VideoCard",
  component: VideoCard,
  args: {
    title: "서면 1번가 야경",
    meta: "조회 214 · 어제",
    durationLabel: "0:42",
    fallback: "서면",
  },
} satisfies Meta<typeof VideoCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 썸네일은 이미지 없이 폴백 상태 — Figma의 회색 thumb 박스와 동일한 와이어 표현 */
export const Default: Story = {};

/** 재생시간 라벨이 없는 구성 (미확보 영상) */
export const NoDuration: Story = {
  args: { durationLabel: undefined },
};

/** 보조 줄을 노드로 조합 — 격자 배지 + 텍스트 */
export const WithMetaNode: Story = {
  args: {
    title: "전포 카페거리 브이로그",
    fallback: "전포",
    durationLabel: "1:05",
    meta: (
      <View className="flex-row items-center gap-xxs">
        <CellBadge label="A-14" />
        <Text className="text-fm-caption text-foreground-muted">
          2일 전 수집
        </Text>
      </View>
    ),
  },
};

/** 썸네일 배경 오버라이드 + 썸네일 위 오버레이 슬롯 (MSG-421 온보딩 2장 히어로) */
export const DarkThumbnailWithOverlay: Story = {
  args: {
    title: "서면 A-14",
    meta: "방금 업로드",
    fallback: undefined,
    // 캐스케이드 승자가 클래스 순서가 아니므로 기본 bg-surface는 important로 덮는다
    thumbnailClassName: "!bg-foreground",
    overlay: (
      <View className="absolute bottom-xs left-xs flex-row items-center gap-xxs rounded-full border border-background/40 bg-background/20 px-2.5 py-1">
        <Text className="text-fm-caption text-primary-foreground">
          ✦ AI 추천 0:03 – 0:08
        </Text>
      </View>
    ),
  },
};

/** 1열 목록 배치 — 도감 갤러리·격자 상세 공용 문법 */
export const List: Story = {
  render: () => (
    <View className="gap-md">
      <VideoCard
        title="서면 1번가 야경"
        meta="조회 214 · 어제"
        durationLabel="0:42"
        fallback="서면"
      />
      <VideoCard
        title="부전시장 골목"
        meta="조회 98 · 3일 전"
        durationLabel="0:58"
        fallback="부전"
      />
    </View>
  ),
};
