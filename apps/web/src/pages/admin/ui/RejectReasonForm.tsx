import { Selector } from "@fillmap/ui-web";
import {
  REJECT_REASON_ITEMS,
  type RejectReasonCode,
} from "@/features/admin-review/model/review-decision";

interface RejectReasonFormProps {
  codes: RejectReasonCode[];
  reasonText: string;
  onToggle: (code: RejectReasonCode) => void;
  onReasonTextChange: (text: string) => void;
  /** 확정 요청 중에는 입력을 잠근다 (AC 8 pending) */
  disabled: boolean;
}

const REASON_TEXT_ID = "reject-reason-text";

/**
 * 반려 입력 (Figma 15525:9683 좌 패널 — AC 5·9) — 항목 체크 4종(2×2) + 사유 자유 서술.
 *
 * 판정은 전부 순수 모델(`review-decision`)이 소유하고 이 컴포넌트는 배선만 한다. 항목은
 * `REJECT_REASON_ITEMS` 데이터를 그대로 순회하므로 코드↔라벨이 화면에서 갈릴 수 없다.
 * 체크는 ui-web `Selector` 재사용(MSG-543 선례)이고, ui-web에 Textarea가 없어 사유는
 * 로컬 textarea다(MSG-554 `UnpublishDialog` 선례 — 승격 후보로만 기록).
 *
 * 미충족 사유 캡션("반려 시 1개 이상 선택")은 상시 노출이다(추정 13) — 버튼이 disabled라
 * 클릭 시점의 안내가 뜰 경로가 없다.
 */
export const RejectReasonForm = ({
  codes,
  reasonText,
  onToggle,
  onReasonTextChange,
  disabled,
}: RejectReasonFormProps) => (
  <div className="flex flex-col gap-md">
    <fieldset className="flex flex-col gap-xs" disabled={disabled}>
      <legend className="text-fm-title text-foreground">반려 항목</legend>
      <p className="text-fm-caption text-foreground-muted">
        반려 시 1개 이상 선택
      </p>
      <div className="mt-xs grid grid-cols-2 gap-x-sm gap-y-xs">
        {REJECT_REASON_ITEMS.map(({ code, label }) => (
          <div key={code} className="flex items-center gap-xs">
            <Selector
              id={`reject-reason-${code}`}
              checked={codes.includes(code)}
              disabled={disabled}
              onCheckedChange={() => onToggle(code)}
            />
            <label
              htmlFor={`reject-reason-${code}`}
              className="text-fm-body text-foreground-body"
            >
              {label}
            </label>
          </div>
        ))}
      </div>
    </fieldset>

    <div className="flex flex-col gap-xs">
      <label htmlFor={REASON_TEXT_ID} className="text-fm-title text-foreground">
        반려 사유
      </label>
      <textarea
        id={REASON_TEXT_ID}
        rows={5}
        value={reasonText}
        disabled={disabled}
        onChange={(event) => onReasonTextChange(event.target.value)}
        placeholder="반려할 경우 구체적인 사유를 입력하세요."
        className="resize-none rounded-sm border border-border bg-surface-soft p-sm text-fm-base text-foreground outline-none placeholder:text-foreground-muted focus:border-primary disabled:opacity-50"
      />
    </div>
  </div>
);
