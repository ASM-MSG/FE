import type { ReactNode } from "react";
import { Button } from "@fillmap/ui-web";
import type { StatusView } from "@/features/admin-accounts/model/account-view";
import { formatKstReceiptTime } from "@/shared/format";
import { StatusChip } from "./StatusChip";

/**
 * 상세 카드 공통 조각 (MSG-551 AC 11·13) — 발급 요청 카드와 아이디 변경 카드가 공유한다.
 * 두 카드가 같은 라벨→값 행과 같은 처리 결과 블록을 쓰게 되어 추출했다
 * (check:duplication 신규 카피 차단 — 두 번째 사용처 규칙).
 */

/** 라벨→값 한 쌍 — 정의 목록 항목이라 스크린리더가 "요청 기관: …"으로 묶어 읽는다 */
export const DetailField = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="flex flex-col gap-xxs">
    <dt className="text-fm-label text-foreground-muted">{label}</dt>
    <dd className="break-all text-fm-body text-foreground">{value}</dd>
  </div>
);

/**
 * 대기 요청의 처리 버튼 행 + 각주 (AC 11·13) — 반려는 outline error, 승인은 primary다.
 * 승인 라벨과 각주만 큐별로 갈린다(발급 요청은 "계정 발급", 아이디 변경은 "승인").
 */
export const PendingActions = ({
  approveText,
  footnote,
  isMutating,
  onApprove,
  onReject,
}: {
  approveText: string;
  footnote: string;
  isMutating: boolean;
  onApprove: () => void;
  onReject: () => void;
}) => (
  <>
    <div className="flex gap-sm">
      <Button
        text="반려"
        variant="secondary"
        size="sm"
        className="flex-1 text-error ring-1 ring-error"
        disabled={isMutating}
        onClick={onReject}
      />
      <Button
        text={approveText}
        size="sm"
        className="flex-1"
        disabled={isMutating}
        onClick={onApprove}
      />
    </div>
    <p className="text-fm-caption text-foreground-muted">{footnote}</p>
  </>
);

/**
 * 처리된 요청의 읽기 전용 결과 (스펙 추정 13) — 상태 칩 + 처리 시각 + (반려면) 사유.
 * 처리 버튼을 없애 이미 처리 409(1422·1428)를 조작 제거로 예방한 자리의 대체 표시다.
 */
export const ProcessedResult = ({
  status,
  processedAt,
  rejectReason,
  children,
}: {
  status: StatusView;
  processedAt: string | null;
  rejectReason: string | null;
  /** 큐별 추가 표시 (예: 발급된 계정 id) */
  children?: ReactNode;
}) => (
  <div className="flex flex-col gap-xs rounded-sm bg-surface p-sm">
    <div className="flex items-center gap-sm">
      <StatusChip {...status} />
      {processedAt !== null && (
        <span className="text-fm-caption text-foreground-muted">
          {`${formatKstReceiptTime(processedAt)} 처리`}
        </span>
      )}
    </div>
    {rejectReason !== null && (
      <p className="text-fm-caption text-foreground-body">{rejectReason}</p>
    )}
    {children}
  </div>
);
