import { Button } from "@fillmap/ui-web";
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
  loading: boolean;
}

export const RouteInputCard = ({
  text,
  onChange,
  onSubmit,
  canSubmit,
  submitLabel,
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
      {/* [MSG-489 확장점] 출발지 상태 행이 이 슬롯에 들어온다 — 지금은 null. */}
      <span />
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
