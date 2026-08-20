import { Text, View } from "react-native";
import { ModalCard, Thumbnail, Toast } from "@fillmap/ui-native";
import {
  deleteCardMeta,
  deleteCardTitle,
  type VideoActionTarget,
} from "../model/video-menu";

interface VideoDeleteConfirmDialogProps {
  visible: boolean;
  target: VideoActionTarget;
  /** 대상 영상의 공개 범위 — 미확보면 카드 2행이 "N일 전 수집"까지만 나온다 */
  visibility: string | null;
  /** 취소·딤 탭·Android back — 삭제 없이 닫기 (S7) */
  onCancel: () => void;
  onConfirm: () => void;
  /** 삭제 요청 진행 중 — 확인 버튼을 비활성화해 연타를 눈에도 막는다 (codex 리뷰 1) */
  submitting: boolean;
  /** 삭제 실패 안내 — 다이얼로그를 유지한 채 카드 아래에 뜬다 (S9) */
  failureMessage: string | null;
}

/**
 * SOURCE: Figma "도감 — 영상 삭제 확인"(node 14856:646) — MSG-431 S6·S7·S9.
 * `ModalCard`(오버레이·`onRequestClose` 자체 포함) + 대상 영상 카드 children.
 *
 * 실패 토스트를 **카드 안**에 그리는 것은 RN Modal 경계 때문이다 — 다이얼로그가 열린 채
 * 재시도할 수 있어야 하는데(S9), 호스트 트리에 그린 토스트는 이 Modal 창 뒤에 가린다.
 * 사용자 눈에는 "다이얼로그가 유지된 채 실패 안내가 뜬다"로 같다.
 *
 * 진행 중 확인 버튼 비활성화(`submitting`)는 발사 가드(`guardMutate`)와 짝이다 — 가드가
 * 중복 DELETE를 막고, 비활성화가 "눌렸는데 아무 일도 안 난다"는 침묵을 없앤다.
 *
 * "취소"가 Figma의 회색 필이 아니라 테두리 pill인 것은 MSG-306에서 확립된 앱 공통 모달
 * 관례이며 `ModalCard`를 고치지 않는다(ui-native 무수정 원칙).
 */
export const VideoDeleteConfirmDialog = ({
  visible,
  target,
  visibility,
  onCancel,
  onConfirm,
  submitting,
  failureMessage,
}: VideoDeleteConfirmDialogProps) => (
  <ModalCard
    visible={visible}
    title="영상을 삭제할까요?"
    description="삭제하면 되돌릴 수 없어요. 이 영상이 채운 격자 기록과 수집 통계에서도 함께 빠집니다."
    cancelText="취소"
    confirmText="삭제"
    confirmVariant="danger"
    confirmDisabled={submitting}
    onCancel={onCancel}
    onOverlayPress={onCancel}
    onConfirm={onConfirm}
  >
    <View className="flex-row items-center gap-sm rounded-md bg-surface-soft p-sm">
      <Thumbnail
        src={target.thumbnailUrl ?? undefined}
        alt="삭제할 영상 썸네일"
        className="size-16"
      />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text numberOfLines={1} className="text-fm-body-strong text-foreground">
          {deleteCardTitle(target.gridLabel, target.durationSec)}
        </Text>
        <Text
          numberOfLines={1}
          className="text-fm-caption text-foreground-muted"
        >
          {deleteCardMeta(target.createdAt, visibility)}
        </Text>
      </View>
    </View>
    {failureMessage !== null && <Toast title={failureMessage} />}
  </ModalCard>
);
