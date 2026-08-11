import { Button, Toast } from "@fillmap/ui-web";
import type { ProcessingNotice } from "../api/use-processing-watcher";

interface BlurNoticeToastProps {
  notice: ProcessingNotice;
  /** 주 행동 — READY: 블러 확인 모달 열기 / FAILED: 재업로드(새 업로드 플로우) */
  onAction: () => void;
  onDismiss: () => void;
}

/** 통지 종류별 문구·행동 라벨 (B16·B17, 티켓 20 카피) */
const NOTICE_COPY: Record<
  ProcessingNotice["kind"],
  { title: string; description: string; actionText: string | null }
> = {
  ready: {
    title: "AI 블러 처리 완료",
    description: "눌러서 결과를 확인하세요",
    actionText: "확인하기",
  },
  failed: {
    title: "블러 처리에 실패했어요",
    description: "영상을 다시 업로드해주세요",
    actionText: "다시 업로드",
  },
  delayed: {
    title: "처리가 늦어지고 있어요",
    description: "블러 처리가 계속 진행 중이에요. 잠시 후 다시 확인해주세요",
    actionText: null,
  },
};

/**
 * 블러 처리 통지 토스트 (MSG-329 B16·B17) — ui-web Toast 재사용(ReportDialog 패턴 확장).
 * READY는 [확인하기]로 블러 확인 모달, FAILED는 [다시 업로드]로 새 업로드 플로우를 연다.
 * 전역 토스트 인프라는 만들지 않는다(단순성 우선 — 사용처 1곳).
 */
export const BlurNoticeToast = ({
  notice,
  onAction,
  onDismiss,
}: BlurNoticeToastProps) => {
  const copy = NOTICE_COPY[notice.kind];
  return (
    <div className="flex flex-col gap-xs">
      <Toast title={copy.title} description={copy.description} />
      <div className="flex justify-end gap-xs">
        {copy.actionText !== null && (
          <Button
            text={copy.actionText}
            variant="primary"
            size="sm"
            onClick={onAction}
          />
        )}
        <Button text="닫기" variant="secondary" size="sm" onClick={onDismiss} />
      </div>
    </div>
  );
};
