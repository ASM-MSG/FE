import { ModalCard, Toast } from "@fillmap/ui-native";
import { useAutoDismissToast } from "../../video-actions/model/use-auto-dismiss-toast";
import { useBlockUser } from "../api/use-user-block-mutations";
import {
  BLOCK_CONFIRM_DESCRIPTION,
  blockConfirmTitle,
  type BlockTarget,
} from "../model/user-block";

interface BlockUserDialogProps {
  /** 차단 대상 — null이면 닫힘 */
  target: BlockTarget | null;
  /** 취소·딤 탭·Android back — 요청 없이 닫기 (기준 3) */
  onClose: () => void;
  /**
   * 차단 성공 — 호출부가 닫고 토스트·후속(pop 등)을 처리한다 (기준 5). 인자는 **제출한** userId:
   * 요청 중 다이얼로그가 닫히거나 다른 대상으로 바뀌어도 `target`이 아닌 이 값으로 후속을 처리한다
   */
  onBlocked: (userId: number) => void;
}

/**
 * 사용자 차단 확인 다이얼로그 (MSG-570 기준 3·4·5·7·8) — 진입점 3곳(격자 상세·재생 화면·
 * 이벤트 댓글)이 **이 컴포넌트 하나**를 쓴다. 뮤테이션·진행 중·실패 문구를 여기가 소유해
 * 진입점이 셋이어도 동작은 하나다.
 * 앱 확인 관례(영상 삭제·로그아웃·탈퇴)대로 `ModalCard` 중앙 카드(A1). 실패 안내는 카드 안
 * `Toast` — RN Modal 경계상 호스트 트리 토스트는 이 창 뒤에 가린다(삭제 다이얼로그 동형).
 */
export const BlockUserDialog = ({
  target,
  onClose,
  onBlocked,
}: BlockUserDialogProps) => {
  const [failure, setFailure] = useAutoDismissToast();

  // 닫힘 경로 전부에서 실패 안내를 비운다 — 다음 대상의 다이얼로그에 지난 실패가 남지 않게
  const close = () => {
    setFailure(null);
    onClose();
  };
  const block = useBlockUser({
    onBlocked: (userId) => {
      setFailure(null);
      onBlocked(userId);
    },
    onError: () => setFailure("차단하지 못했어요. 잠시 후 다시 시도해 주세요"),
  });

  return (
    <ModalCard
      visible={target !== null}
      title={blockConfirmTitle(target?.nickname ?? "")}
      description={BLOCK_CONFIRM_DESCRIPTION}
      cancelText="취소"
      confirmText="차단"
      confirmVariant="danger"
      confirmDisabled={block.isPending}
      onCancel={close}
      onOverlayPress={close}
      onConfirm={() => {
        // 연타 방어는 `mutate`의 in-flight 가드가 맡는다 (guardMutate)
        if (target !== null) block.mutate({ userId: target.userId });
      }}
    >
      {failure !== null && <Toast title={failure} />}
    </ModalCard>
  );
};
