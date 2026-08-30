import { Button } from "@fillmap/ui-web";
import { Navigation } from "lucide-react";
import { MAX_ROUTE_TEXT_LENGTH } from "@/features/ai-route/model/route-request";

/**
 * 입력 카드 (Figma 15666:12402·12855) — 테두리 없는 멀티라인 textarea + 하단 액션 행.
 * ui-web `Input`은 자체 h-12·보더·단일행이라 카드 안에 넣으면 이중 테두리가 된다(§3-3).
 * 500자는 서버 계약 상한이라 하드 컷으로 막는다 — 카운터는 두지 않는다(Q11).
 */
interface RouteInputCardProps {
  text: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  /** 제출 가능 여부 — 판정은 route-request.canSubmit(순수) 소유 */
  canSubmit: boolean;
  /** 버튼 문구 — 입력 대기 "동선 짜기" / 결과·실패 "다시 짜기" (로딩은 아래에서 덮는다) */
  submitLabel: string;
  /** 현위치가 뷰포트 안이라 출발지가 실리는가 — 상태 표시일 뿐 누르는 컨트롤이 아니다 (D8) */
  originActive: boolean;
  loading: boolean;
}

export const RouteInputCard = ({
  text,
  onChange,
  onSubmit,
  canSubmit,
  submitLabel,
  originActive,
  loading,
}: RouteInputCardProps) => (
  <div className="flex flex-col gap-sm rounded-md border border-border bg-surface-soft p-3.5">
    <label className="sr-only" htmlFor="ai-route-text">
      하고 싶은 일 한 문장
    </label>
    <textarea
      id="ai-route-text"
      rows={2}
      maxLength={MAX_ROUTE_TEXT_LENGTH}
      readOnly={loading}
      value={text}
      onChange={(event) => onChange(event.target.value)}
      placeholder={
        "하고 싶은 일을 적어 주세요\n예) 오늘 오후에 축제 보고 카페 들르기"
      }
      className="resize-none bg-transparent text-fm-base text-foreground outline-none placeholder:text-foreground-muted"
    />
    <div className="flex items-center justify-between gap-sm">
      {/* 좌측 슬롯 — 출발지가 실릴 때만 상태 행이 뜬다 (Figma 15666:12571). 없으면 자리만 (S2) */}
      {originActive ? (
        <span className="flex items-center gap-1.25 text-fm-label text-foreground-muted">
          <Navigation aria-hidden className="size-3.25" />
          현재 위치에서 출발
        </span>
      ) : (
        <span />
      )}
      <Button
        text={loading ? "짜는 중…" : submitLabel}
        variant="primary"
        size="sm"
        disabled={!canSubmit}
        // 로딩 상태만 Figma 지정대로 primary 면 + 50% 불투명 (빈 입력 비활성은 ui-web 기본)
        className={
          loading
            ? "disabled:bg-primary disabled:text-primary-foreground disabled:opacity-50"
            : undefined
        }
        onClick={onSubmit}
      />
    </div>
  </div>
);
