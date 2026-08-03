import { Modal, Pressable, Text, View } from "react-native";
import type { ReactNode } from "react";
import { X } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { cx } from "./lib/cx";

interface ModalCardProps {
  /** RN Modal 표시 여부 — 웹(마운트 제어)과 달리 RN은 Modal prop으로 제어한다 (기본 true) */
  visible?: boolean;
  title: string;
  description?: string;
  /** 콘텐츠 슬롯 */
  children?: ReactNode;
  cancelText?: string;
  confirmText?: string;
  /** true면 확인 버튼을 비활성(클릭 차단 + 비활성 시각)한다 */
  confirmDisabled?: boolean;
  /** 확인 버튼 색상 — danger는 삭제·신고 등 파괴적 액션용 (기본 primary) */
  confirmVariant?: "primary" | "danger";
  onCancel?: () => void;
  onConfirm?: () => void;
  /** 지정하면 우측 상단 닫기 버튼 표시 */
  onClose?: () => void;
  className?: string;
}

/**
 * SOURCE: Figma "FeelMap ModalCard" (node 13406:696) — 모달/다이얼로그 쉘.
 * 웹은 프레젠테이셔널 카드(오버레이는 Radix Dialog)지만, RN은 dialog-shell 없이
 * RN Modal + 오버레이를 직접 포함한다 (오버레이 색은 ui-web dialog-shell과 동일).
 *
 * @example
 * <ModalCard visible={open} title="삭제할까요?" cancelText="취소" confirmText="확인" onCancel={close} onConfirm={onDelete} />
 */
export const ModalCard = ({
  visible = true,
  title,
  description,
  children,
  cancelText,
  confirmText,
  confirmDisabled,
  confirmVariant = "primary",
  onCancel,
  onConfirm,
  onClose,
  className,
}: ModalCardProps) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    onRequestClose={onClose ?? onCancel}
  >
    <View className="flex-1 items-center justify-center bg-navy-900/40 p-lg">
      <View
        accessibilityViewIsModal
        className={cx(
          "w-full max-w-120 gap-md rounded-[20px] bg-surface-elevated p-7 shadow-modal",
          className,
        )}
      >
        <View className="flex-row items-center">
          <Text className="flex-1 text-fm-display text-foreground">
            {title}
          </Text>
          {onClose && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="닫기"
              onPress={onClose}
              className="active:opacity-60"
            >
              <X size={16} color={semantic.muted} />
            </Pressable>
          )}
        </View>
        {description && (
          <Text className="text-fm-body text-foreground-body">
            {description}
          </Text>
        )}
        {children}
        {(cancelText || confirmText) && (
          <View className="flex-row gap-2.5">
            {cancelText && (
              <Pressable
                accessibilityRole="button"
                onPress={onCancel}
                className="h-12 flex-1 items-center justify-center rounded-full border border-border active:opacity-80"
              >
                <Text className="text-fm-title text-foreground-body">
                  {cancelText}
                </Text>
              </Pressable>
            )}
            {confirmText && (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !!confirmDisabled }}
                disabled={confirmDisabled}
                onPress={onConfirm}
                className={cx(
                  "h-12 flex-1 items-center justify-center rounded-full active:opacity-80",
                  confirmVariant === "danger" ? "bg-error" : "bg-primary",
                  confirmDisabled && "opacity-50",
                )}
              >
                <Text className="text-fm-title text-primary-foreground">
                  {confirmText}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  </Modal>
);
