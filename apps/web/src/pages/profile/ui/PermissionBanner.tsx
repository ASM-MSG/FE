import type { PermissionBannerMode } from "@/features/notifications/model/permission-banner";

interface PermissionBannerProps {
  /** 노출 형태 — 파생은 derivePermissionBanner(model) 몫, 렌더 여부는 호출부 몫 */
  mode: PermissionBannerMode;
  /** "허용하기" — 408 use-push-toggle ON 플로우(제스처 컨텍스트 권한 요청→토큰 등록) */
  onAllow: () => void;
  /** 권한 요청·등록 왕복 중 — 재조작 차단 */
  busy?: boolean;
}

/**
 * 브라우저 알림 권한 배너 (MSG-409 AC 9·10, Figma 14783:3344) — 수신 불가 상태에서만
 * 렌더된다(조건부 — 호출부가 derivePermissionBanner로 판정). denied/실패 안내는
 * 기존 PushNoticeHost 스택 몫 — 배너는 진입점만 제공한다.
 * 미지원 브라우저(unsupported)는 CTA 없는 안내로 대체한다 (AC 10).
 */
export const PermissionBanner = ({
  mode,
  onAllow,
  busy = false,
}: PermissionBannerProps) => (
  <div className="flex items-center gap-sm rounded-md bg-primary/10 px-md py-sm">
    <p className="min-w-0 flex-1 text-fm-body text-primary">
      브라우저 알림이 꺼져 있어요
    </p>
    {mode === "cta" ? (
      <button
        type="button"
        onClick={onAllow}
        disabled={busy}
        aria-busy={busy}
        className="shrink-0 text-fm-body-strong text-primary disabled:opacity-50"
      >
        허용하기 ›
      </button>
    ) : (
      <span className="shrink-0 text-fm-caption text-foreground-muted">
        미지원 브라우저
      </span>
    )}
  </div>
);
