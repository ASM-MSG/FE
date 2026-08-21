import { Select } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import { REPORT_REASONS } from "../model/report";

interface ReportReasonSelectProps {
  /** 선택된 사유 id. 미선택이면 null */
  value: string | null;
  onValueChange: (reasonId: string) => void;
}

/**
 * 신고 사유 선택 필드 — Radix Select 기반 로컬 구현 (MSG-116 S5·S6 →
 * MSG-411에서 widgets/cell-detail로부터 이동, 마크업 무변경).
 * 소비처가 신고 모달 1곳뿐이라 ui-web 승격 대신 로컬로 둔다(스펙 트레이드오프 결정).
 * 옵션 팝업은 Radix 기본 포털로 렌더되어 컨테이너의 overflow 클리핑을 회피한다(R3).
 */
export const ReportReasonSelect = ({
  value,
  onValueChange,
}: ReportReasonSelectProps) => (
  <Select.Root value={value ?? undefined} onValueChange={onValueChange}>
    <Select.Trigger
      aria-label="신고 사유"
      className="flex h-12 w-full items-center justify-between rounded-md border border-border bg-background px-md text-fm-base text-foreground outline-none transition-colors focus:border-primary data-[placeholder]:text-foreground-muted"
    >
      <Select.Value placeholder="신고 사유를 선택해주세요" />
      <Select.Icon className="text-foreground-muted">
        <ChevronDown className="size-4" />
      </Select.Icon>
    </Select.Trigger>
    <Select.Portal>
      <Select.Content
        position="popper"
        sideOffset={4}
        className="z-50 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-border bg-surface-elevated shadow-modal"
      >
        <Select.Viewport className="flex flex-col gap-xxs p-xs">
          {REPORT_REASONS.map((reason) => (
            <Select.Item
              key={reason.id}
              value={reason.id}
              className="flex cursor-pointer items-center justify-between gap-sm rounded-sm px-sm py-2 text-fm-base text-foreground outline-none data-[highlighted]:bg-surface"
            >
              <Select.ItemText>{reason.label}</Select.ItemText>
              <Select.ItemIndicator className="text-primary">
                <Check className="size-4" strokeWidth={3} />
              </Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Viewport>
      </Select.Content>
    </Select.Portal>
  </Select.Root>
);
