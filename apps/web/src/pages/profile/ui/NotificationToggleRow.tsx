import { useId } from "react";
import { Switch } from "@fillmap/ui-web";

interface NotificationToggleRowProps {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** PATCH 왕복 중 — 결과 확정 전 재조작을 막는다 (MSG-409 AC 8) */
  busy?: boolean;
}

/**
 * 알림 카테고리 토글 행 (MSG-409 AC 4·8·13) — 카드형(라벨+설명 2줄 + Switch,
 * Figma 14783:3344). SettingToggleRow(1줄·설명 없음)와 형태가 달라 신규이며
 * htmlFor/id 연결·busy 재조작 차단 관례는 미러한다. label이 스위치의 접근 가능한
 * 이름이 되고 라벨 클릭도 토글한다 (AC 13). 프로필 전용 — 승격 비대상 (스펙 명시).
 */
export const NotificationToggleRow = ({
  label,
  description,
  checked,
  onCheckedChange,
  busy = false,
}: NotificationToggleRowProps) => {
  const switchId = useId();
  return (
    <div className="flex items-center gap-sm rounded-md bg-surface p-md">
      {/* label은 제목만 감싼다 — 설명까지 넣으면 스위치의 접근 가능한 이름이
          두 줄 전체가 돼 라벨로 못 찾는다 (AC 13 — 이름 = 행 라벨) */}
      <div className="flex min-w-0 flex-1 flex-col gap-xxs">
        <label
          htmlFor={switchId}
          className="truncate text-fm-body-strong text-foreground"
        >
          {label}
        </label>
        <span className="truncate text-fm-caption text-foreground-muted">
          {description}
        </span>
      </div>
      <Switch
        id={switchId}
        checked={checked}
        disabled={busy}
        onCheckedChange={onCheckedChange}
      />
    </div>
  );
};
