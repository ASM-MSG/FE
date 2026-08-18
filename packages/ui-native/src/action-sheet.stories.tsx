import { useState } from "react";
import { View } from "react-native";
import { Flag, Pencil, Trash2 } from "lucide-react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import {
  ActionSheet,
  ActionSheetDivider,
  ActionSheetItem,
  ActionSheetSectionLabel,
} from "./action-sheet";
import { Button } from "./button";

/** RN Modal은 항상 화면 전체를 덮으므로 버튼으로 열고 닫는 데모로 구성한다 (ModalCard 선례) */
const MoreMenuDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <View className="items-start">
      <Button
        text="더보기 시트 열기"
        variant="secondary"
        onPress={() => setOpen(true)}
      />
      <ActionSheet visible={open} onClose={() => setOpen(false)}>
        <ActionSheetItem
          icon={Pencil}
          label="수정하기"
          onPress={() => setOpen(false)}
        />
        <ActionSheetItem
          icon={Trash2}
          label="삭제하기"
          danger
          onPress={() => setOpen(false)}
        />
        <ActionSheetItem
          icon={Flag}
          label="신고하기"
          onPress={() => setOpen(false)}
        />
      </ActionSheet>
    </View>
  );
};

/** 섹션 라벨 + 선택 ✓ 행 + 구분선 + danger 행 조합 (도감 공개 범위 시트) */
const VisibilityDemo = () => {
  const [open, setOpen] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  return (
    <View className="items-start">
      <Button
        text="공개 범위 시트 열기"
        variant="secondary"
        onPress={() => setOpen(true)}
      />
      <ActionSheet visible={open} onClose={() => setOpen(false)}>
        <ActionSheetSectionLabel label="공개 범위" />
        <ActionSheetItem
          label="전체 공개"
          selected={isPublic}
          onPress={() => setIsPublic(true)}
        />
        <ActionSheetItem
          label="나만 보기"
          selected={!isPublic}
          onPress={() => setIsPublic(false)}
        />
        <ActionSheetDivider />
        <ActionSheetItem
          icon={Trash2}
          label="삭제하기"
          danger
          onPress={() => setOpen(false)}
        />
      </ActionSheet>
    </View>
  );
};

const meta = {
  title: "Components/ActionSheet",
  component: ActionSheet,
  args: {
    visible: false,
    onClose: () => {},
    children: null,
  },
} satisfies Meta<typeof ActionSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 더보기형 — 아이콘 행 3개 + 취소 */
export const MoreMenu: Story = {
  render: () => <MoreMenuDemo />,
};

/** 공개 범위형 — 섹션 라벨·선택 ✓·구분선·danger */
export const Visibility: Story = {
  render: () => <VisibilityDemo />,
};
