import { ChevronRight } from "lucide-react";

/**
 * 준비 중(비활성) › 행 (AC 7·10, A4) — 포커스 가능한 button + aria-disabled + "준비 중" 캡션.
 * 네이티브 disabled는 탭 순서에서 빠져 AC 10(포커스 순회)과 충돌하므로 쓰지 않는다.
 * 핸들러 자체를 두지 않아 클릭은 no-op — URL·화면 전환이 일어나지 않는다.
 * "준비 중" 캡션은 Figma에 없는 티켓 a11y 요구 추가분 (A4 — 비활성 사유 시각 구분).
 */
export const SettingRow = ({ label }: { label: string }) => (
  <button
    type="button"
    aria-disabled="true"
    className="flex w-full cursor-default items-center gap-sm py-sm text-left"
  >
    <span className="flex-1 truncate text-fm-body text-foreground">
      {label}
    </span>
    <span className="shrink-0 text-fm-caption text-foreground-muted">
      준비 중
    </span>
    <ChevronRight className="size-4 shrink-0 text-icon" />
  </button>
);

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
