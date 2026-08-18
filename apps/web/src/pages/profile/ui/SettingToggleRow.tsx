import { useId } from "react";
import { Switch } from "@fillmap/ui-web";

interface SettingToggleRowProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** 미지원 브라우저 등 조작 불가 상태 — 캡션과 함께 비활성 표시 (MSG-408 AC 8) */
  disabled?: boolean;
  /** 비활성 사유 캡션 — SettingRow "준비 중" 캡션 관례 미러 */
  disabledCaption?: string;
  /** 등록/해제 API 왕복 중 — 결과 확정 전 재조작을 막는다 */
  busy?: boolean;
}

/**
 * 설정 › 토글 행 (MSG-408 AC 4·8) — SettingRow 행 레이아웃 관례 + ui-web Switch.
 * label↔Switch는 htmlFor/id로 연결해 라벨 클릭도 토글하고 스위치의 접근 가능한
 * 이름이 된다. 비활성은 Switch disabled + 사유 캡션 — 조작 불가를 시각·보조기기
 * 양쪽에 알린다. 프로필 전용(승격 비대상 — 두 번째 사용처에서 논의, 스펙 명시).
 */
export const SettingToggleRow = ({
  label,
  checked,
  onCheckedChange,
  disabled = false,
  disabledCaption,
  busy = false,
}: SettingToggleRowProps) => {
  const switchId = useId();
  return (
    <div className="flex items-center gap-sm py-sm">
      <label
        htmlFor={switchId}
        className="flex-1 truncate text-fm-body text-foreground"
      >
        {label}
      </label>
      {disabled && disabledCaption !== undefined && (
        <span className="shrink-0 text-fm-caption text-foreground-muted">
          {disabledCaption}
        </span>
      )}
      <Switch
        id={switchId}
        checked={checked}
        disabled={disabled || busy}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
};
