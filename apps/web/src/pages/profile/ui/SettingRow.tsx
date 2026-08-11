import { ChevronRight } from "lucide-react";
import { cn } from "@fillmap/ui-web";

interface SettingRowProps {
  label: string;
  /**
   * 클릭 핸들러 — 지정하면 활성 행(MSG-329 [계정 삭제] 신설), 미지정이면 기존
   * 준비 중(비활성) 행이다.
   */
  onClick?: () => void;
  /** 활성 행 라벨 강조색 — 파괴적 액션(계정 삭제)용 */
  tone?: "default" | "danger";
}

/**
 * 설정 › 행 (AC 7·10, A4 → MSG-329 onClick 확장).
 * - 비활성(기본): 포커스 가능한 button + aria-disabled + "준비 중" 캡션. 네이티브
 *   disabled는 탭 순서에서 빠져 포커스 순회와 충돌하므로 쓰지 않는다. 클릭 no-op.
 * - 활성(onClick 지정): 캡션·aria-disabled 없이 실제 클릭 동작을 가진다.
 */
export const SettingRow = ({
  label,
  onClick,
  tone = "default",
}: SettingRowProps) => {
  const active = onClick !== undefined;
  return (
    <button
      type="button"
      aria-disabled={active ? undefined : "true"}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-sm py-sm text-left",
        active ? "cursor-pointer" : "cursor-default",
      )}
    >
      <span
        className={cn(
          "flex-1 truncate text-fm-body",
          tone === "danger" ? "text-error" : "text-foreground",
        )}
      >
        {label}
      </span>
      {!active && (
        <span className="shrink-0 text-fm-caption text-foreground-muted">
          준비 중
        </span>
      )}
      <ChevronRight className="size-4 shrink-0 text-icon" />
    </button>
  );
};

/**
 * 정보 행 (AC 8) — 우측에 값 텍스트만 표시. 클릭·키보드 포커스 대상이 아니고 › 표시가 없다
 * (앱 버전 행 전용).
 */
export const SettingInfoRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-sm py-sm">
    <span className="flex-1 truncate text-fm-body text-foreground">
      {label}
    </span>
    <span className="shrink-0 text-fm-body text-foreground-muted">{value}</span>
  </div>
);
