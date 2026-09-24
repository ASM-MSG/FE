import { useState } from "react";
import { BlockUserDialog } from "../../user-block/ui/block-user-dialog";
import type { BlockTarget } from "../../user-block/model/user-block";
import {
  useDeleteVideo,
  useReportVideo,
  useSetVideoVisibility,
} from "../api/use-video-mutations";
import { useVideoVisibilityQuery } from "../api/use-video-visibility-query";
import { reportFailureNotice, type ReportReasonId } from "../model/report";
import { useAutoDismissToast } from "../model/use-auto-dismiss-toast";
import {
  shouldPatchVisibility,
  type VideoActionTarget,
} from "../model/video-menu";
import { ActionToast } from "./action-toast";
import { ReportModal } from "./report-modal";
import { VideoDeleteConfirmDialog } from "./video-delete-confirm-dialog";
import { VideoMoreSheet } from "./video-more-sheet";

interface VideoActionsMenuProps {
  /** 더보기 시트 열림 — 트리거(`VideoMoreButton`)는 진입점 화면이 배치한다 */
  open: boolean;
  onClose: () => void;
  target: VideoActionTarget;
  /** 내 영상 여부 — 도감 갤러리는 정의상 항상 true, 격자 상세는 my-videos 교집합 판정 */
  mine: boolean;
  /** 타인 영상의 작성자 — "사용자 차단" 대상 (MSG-570). `mine=false`인 진입점만 넘긴다 */
  author?: BlockTarget;
  /** 차단 성공 후 — 재생 화면은 이전 화면으로 pop, 목록 화면은 재조회에 맡겨 생략 */
  onBlocked?: () => void;
}

/**
 * 영상 액션 오버레이 묶음 (MSG-431 S1~S10 · MSG-570) — 더보기 시트 + 삭제 확인 다이얼로그 +
 * 신고 모달 + 차단 확인 다이얼로그 + 토스트와 그 상태·서버 호출을 한 곳에서 소유한다.
 * 도감 갤러리 카드·격자 상세 영상 행·재생 화면이 이것 하나를 재사용한다(진입점이 셋이어도
 * 동작은 하나여야 한다).
 *
 * **[MSG-570] 신고 흐름을 진입점 화면에서 이 안으로 흡수했다**(A2 채택) — 재생 화면에도 같은
 * 시트(신고하기·사용자 차단)가 필요해졌고, 화면마다 신고 모달·토스트를 배선하면 세 화면이
 * 갈린다(웹 `VideoMoreMenu`가 `ReportDialog`를 소유하는 구조와 동일). 신고 대상은 이 메뉴의
 * `target.videoId` 하나라 별도 대상 상태가 없다. 부수 효과: 격자 상세의 신고 성공 토스트가
 * `pointerEvents=none` 오버레이에서 `ActionToast`(탭 해제 Modal)로 바뀐다.
 *
 * 공개 범위는 **비낙관**이다(승인 Q6): 선택 즉시 시트를 닫고 요청만 보내며, ✓는 움직이지
 * 않는다. 성공 시 응답 값이 캐시에 seed돼 다시 열면 ✓가 옮겨져 있고, 실패 시 ✓가 이전
 * 상태 그대로라 "이전 상태로 되돌린다"는 요구가 자동 충족된다 — 알림만 토스트가 맡는다.
 *
 * 액션 전부가 `guardMutate` in-flight 가드를 통과해 발사된다 — 연타로 중복 요청이
 * 나가면 뒤늦은 실패가 이미 닫힌 화면의 상태를 건드린다(MSG-431 codex 리뷰 1·2).
 *
 * 삭제는 서버가 정본이다 — 성공 시 목록·통계를 무효화해 재조회로 사라지게 하고(승인 Q5),
 * 실패하면 다이얼로그를 유지해 같은 자리에서 재시도할 수 있다.
 */
export const VideoActionsMenu = ({
  open,
  onClose,
  target,
  mine,
  author,
  onBlocked,
}: VideoActionsMenuProps) => {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockTarget, setBlockTarget] = useState<BlockTarget | null>(null);
  const [actionMessage, setActionMessage] = useAutoDismissToast();
  const [deleteMessage, setDeleteMessage] = useAutoDismissToast();
  const [reportFailure, setReportFailure] = useAutoDismissToast();

  // 시트가 열려 있거나 삭제 확인이 떠 있는 동안에만 조회한다 — 삭제 카드 2행도 이 값을 쓴다
  const { visibility } = useVideoVisibilityQuery(
    target.videoId,
    open || deleteOpen,
  );

  const setVisibility = useSetVideoVisibility({
    onError: () =>
      setActionMessage(
        "공개 범위를 변경하지 못했어요. 잠시 후 다시 시도해 주세요.",
      ),
  });
  /**
   * 삭제 다이얼로그 닫기 — **실패 안내도 함께 비운다**. 실패 안내는 3초 자동 소멸이라
   * 그 사이에 닫고 다시 열면 지난 실패가 남는다. 성공 닫힘도 같은 경로를 탄다
   * (신고 모달의 `closeReport`와 같은 처리 — MSG-431 codex 리뷰 1 후반부).
   */
  const closeDelete = () => {
    setDeleteOpen(false);
    setDeleteMessage(null);
  };

  const deleteVideo = useDeleteVideo({
    onDeleted: closeDelete,
    onError: () =>
      setDeleteMessage("영상을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요."),
  });

  /** 신고 모달 닫기 — 실패 안내를 함께 비운다(삭제와 같은 잔존 방지) */
  const closeReport = () => {
    setReportOpen(false);
    setReportFailure(null);
  };

  const report = useReportVideo({
    onReported: () => {
      closeReport();
      setActionMessage("신고가 접수되었어요");
    },
    onFailed: (error) => {
      const notice = reportFailureNotice(error);
      if (notice.shouldClose) {
        closeReport();
        setActionMessage(notice.message);
        return;
      }
      setReportFailure(notice.message);
    },
  });

  const handleReportSubmit = (reasonId: ReportReasonId) => {
    // 연타 방어는 `mutate`에 씌워진 in-flight 가드가 맡는다 (guardMutate — codex 리뷰 2)
    report.mutate({ videoId: target.videoId, reasonId });
  };

  return (
    <>
      <VideoMoreSheet
        visible={open}
        onClose={onClose}
        mine={mine}
        currentVisibility={visibility}
        onSelectVisibility={(next) => {
          onClose();
          // 같은 값 재선택은 요청 없이 닫기만 한다
          if (!shouldPatchVisibility(visibility, next)) return;
          setVisibility.mutate({ videoId: target.videoId, visibility: next });
        }}
        onDelete={() => {
          onClose();
          setDeleteOpen(true);
        }}
        onReport={() => {
          onClose();
          setReportOpen(true);
        }}
        onBlock={() => {
          onClose();
          // 작성자 미확보(진입점이 안 넘김)면 아무것도 띄우지 않는다 — 대상 없는 차단은 없다
          if (author !== undefined) setBlockTarget(author);
        }}
      />

      <VideoDeleteConfirmDialog
        visible={deleteOpen}
        target={target}
        visibility={visibility}
        onCancel={closeDelete}
        onConfirm={() =>
          // 연타 방어는 `mutate`에 씌워진 in-flight 가드가 맡는다 (guardMutate)
          deleteVideo.mutate({
            videoId: target.videoId,
            gridId: target.gridId,
          })
        }
        submitting={deleteVideo.isPending}
        failureMessage={deleteMessage}
      />

      {/* 영상 신고 모달 (MSG-317 AC 9~13) — 대상은 이 메뉴의 영상 하나 */}
      <ReportModal
        visible={reportOpen}
        onClose={closeReport}
        onSubmit={handleReportSubmit}
        submitting={report.isPending}
        failureMessage={reportFailure}
      />

      {/* 사용자 차단 확인 (MSG-570 기준 3~8) — 성공 토스트는 재생 화면 pop 시 함께 사라진다(A3) */}
      <BlockUserDialog
        target={blockTarget}
        onClose={() => setBlockTarget(null)}
        onBlocked={() => {
          setBlockTarget(null);
          setActionMessage("차단했어요");
          onBlocked?.();
        }}
      />

      <ActionToast
        message={actionMessage}
        onDismiss={() => setActionMessage(null)}
      />
    </>
  );
};
