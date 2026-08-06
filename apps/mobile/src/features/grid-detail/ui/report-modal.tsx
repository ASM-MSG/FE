import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronDown } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import { ModalCard, cx } from "@fillmap/ui-native";
import { REPORT_TYPES, type ReportTypeCode } from "../model/report-types";

interface ReportModalProps {
  visible: boolean;
  /** 취소·딤 탭·Android back — 제출 없이 닫기 (AC 13) */
  onClose: () => void;
  /** 제출(mock — 서버 전송 없음) — 접수 토스트는 화면 쪽 소유 (AC 12) */
  onSubmit: () => void;
}

/**
 * 영상 신고 모달 (MSG-317 AC 9~13, Figma 14094:4253) — ModalCard children에
 * "신고 유형" 펼침형 셀렉트(RN에 네이티브 select 없음 — 추정 3). 유형 미선택 시
 * [신고 제출] 비활성(confirmDisabled). 닫힐 때 로컬 상태를 리셋해 재열기 시
 * 미선택 초기 상태다 (추정 5). Figma "Select..."는 컴포넌트 기본값 플레이스홀더 —
 * 실표시는 한국어 (스펙 오탐 방지 목록).
 */
export const ReportModal = ({
  visible,
  onClose,
  onSubmit,
}: ReportModalProps) => {
  const [selected, setSelected] = useState<ReportTypeCode | null>(null);
  const [expanded, setExpanded] = useState(false);

  const reset = () => {
    setSelected(null);
    setExpanded(false);
  };
  const close = () => {
    reset();
    onClose();
  };
  const submit = () => {
    reset();
    onSubmit();
  };

  const selectedLabel = REPORT_TYPES.find(
    (option) => option.reportType === selected,
  )?.label;

  return (
    <ModalCard
      visible={visible}
      title="영상 신고"
      description="신고 사유를 선택해주세요."
      cancelText="취소"
      confirmText="신고 제출"
      confirmDisabled={!selected}
      onCancel={close}
      onOverlayPress={close}
      onConfirm={submit}
    >
      <View className="gap-xs">
        <Text className="text-fm-label text-foreground-body">신고 유형</Text>
        {/* 셀렉트 필드 — 탭으로 목록 펼침/접힘 (AC 10, 추정 3) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="신고 유형 선택"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((prev) => !prev)}
          className="h-12 flex-row items-center gap-xs rounded-md border border-border px-md active:opacity-80"
        >
          <Text
            className={cx(
              "flex-1 text-fm-body",
              selectedLabel ? "text-foreground" : "text-foreground-muted",
            )}
          >
            {selectedLabel ?? "신고 유형을 선택해주세요"}
          </Text>
          {/* 펼침 상태 회전 어포던스 (리뷰 반영) — 펼침 UI는 Figma 부재 자체 구성(추정 3) */}
          <ChevronDown
            size={16}
            color={semantic.muted}
            style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
          />
        </Pressable>
        {expanded && (
          <View className="rounded-md border border-border">
            {REPORT_TYPES.map((option, i) => (
              <Pressable
                key={option.reportType}
                accessibilityRole="button"
                accessibilityState={{
                  selected: option.reportType === selected,
                }}
                onPress={() => {
                  setSelected(option.reportType);
                  setExpanded(false);
                }}
                className={cx(
                  "px-md py-sm active:bg-surface-soft",
                  i > 0 && "border-t border-border",
                )}
              >
                <Text className="text-fm-body text-foreground">
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ModalCard>
  );
};
