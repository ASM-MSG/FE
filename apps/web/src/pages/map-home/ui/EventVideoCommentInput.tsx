import type { FocusEventHandler } from "react";
import { Button, Input } from "@fillmap/ui-web";
import { canSubmitComment } from "@/features/event/model/event-video-view";

interface EventVideoCommentInputProps {
  value: string;
  onChange: (value: string) => void;
  /** 전송 — 게이트(비로그인·잠금·판정)는 패널이 소유, 여기선 form 계약만 */
  onSubmit: () => void;
  /** 상세 interactionLocked (AC 10) — 입력·전송 비활성 */
  locked: boolean;
  /** 전송 진행 중 — 중복 전송 방지 */
  submitting: boolean;
  /** 비로그인 게이트 훅업 (AC 6) — 패널이 focus 시점에 로그인 모달을 연다 */
  onFocus?: FocusEventHandler<HTMLInputElement>;
}

/**
 * 행사 영상 댓글 입력 (MSG-520 AC 8·10) — trim 1~500자 판정(canSubmitComment)을
 * 전송 버튼 활성에 반영한다. 빈 입력은 전송 불가.
 */
export const EventVideoCommentInput = ({
  value,
  onChange,
  onSubmit,
  locked,
  submitting,
  onFocus,
}: EventVideoCommentInputProps) => (
  <form
    className="flex shrink-0 items-center gap-xs"
    onSubmit={(event) => {
      event.preventDefault();
      onSubmit();
    }}
  >
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onFocus={onFocus}
      disabled={locked}
      maxLength={500}
      aria-label="댓글 입력"
      placeholder={
        locked ? "종료된 행사라 댓글을 남길 수 없어요" : "댓글을 입력해주세요"
      }
      className="h-9 bg-surface"
    />
    <Button
      text="등록"
      type="submit"
      size="sm"
      disabled={locked || submitting || !canSubmitComment(value)}
      className="min-w-14 shrink-0"
    />
  </form>
);
