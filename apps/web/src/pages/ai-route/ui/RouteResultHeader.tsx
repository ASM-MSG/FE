import { DotsLoader } from "@fillmap/ui-web";

/**
 * 상태줄 (Figma 15666:12621·12855) — "AI 추천" 뱃지 + 진행/개수, 우측에 뷰포트 근거 문구.
 * `role="status"`라 로딩→결과 전환이 스크린리더에 낭독된다 (S13).
 */
interface RouteResultHeaderProps {
  /** 로딩 중이면 개수 대신 "동선 찾는 중" + 도트 로더 */
  loading: boolean;
  count: number;
}

export const RouteResultHeader = ({
  loading,
  count,
}: RouteResultHeaderProps) => (
  <div role="status" className="flex items-center justify-between gap-sm">
    <span className="flex items-center gap-xs">
      <span className="rounded-full bg-theme-route/12 px-2 py-0.5 text-fm-label text-theme-route">
        AI 추천
      </span>
      <span className="text-fm-label text-foreground-muted">
        {loading ? "· 동선 찾는 중" : `· ${count}곳`}
      </span>
      {loading && (
        // 바깥 role="status"가 이미 "동선 찾는 중"을 낭독한다 — 도트는 장식으로만 둔다(MSG-488 검증 a11y 지적).
        <span aria-hidden>
          <DotsLoader label="동선 찾는 중" className="gap-1" />
        </span>
      )}
    </span>
    <span className="shrink-0 text-fm-caption text-foreground-muted">
      지금 지도 범위 기준
    </span>
  </div>
);
