import { useState } from "react";
import { View } from "react-native";
import type { Meta, StoryObj } from "@storybook/react-native";
import { Button } from "./button";
import { ModalCard } from "./modal-card";

/** RN Modal은 항상 화면 전체를 덮으므로 버튼으로 열고 닫는 데모로 구성한다 */
const ModalCardDemo = ({ danger = false }: { danger?: boolean }) => {
  const [open, setOpen] = useState(false);
  return (
    <View className="items-start">
      <Button
        text={danger ? "신고 모달 열기" : "로그아웃 모달 열기"}
        variant="secondary"
        onPress={() => setOpen(true)}
      />
      <ModalCard
        visible={open}
        title={danger ? "이 영상을 신고할까요?" : "로그아웃할까요?"}
        description={
          danger
            ? "신고한 영상은 검토 후 숨김 처리돼요"
            : "다시 로그인하면 도감이 그대로 유지돼요"
        }
        cancelText="취소"
        confirmText={danger ? "신고" : "로그아웃"}
        confirmVariant={danger ? "danger" : "primary"}
        onCancel={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
      />
    </View>
  );
};

const meta = {
  title: "Components/ModalCard",
  component: ModalCard,
  args: {
    visible: false,
    title: "로그아웃할까요?",
  },
} satisfies Meta<typeof ModalCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** primary 확인 버튼 (로그아웃 다이얼로그 구성) */
export const Confirm: Story = {
  render: () => <ModalCardDemo />,
};

/** danger 확인 버튼 (신고 다이얼로그 구성) */
export const Danger: Story = {
  render: () => <ModalCardDemo danger />,
};
