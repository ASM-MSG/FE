import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ActionSheet,
  ActionSheetDivider,
  ActionSheetItem,
  ActionSheetSectionLabel,
} from "@fillmap/ui-native";
import { VISIBILITY_OPTIONS, type VideoVisibility } from "../model/video-menu";

interface VideoMoreSheetProps {
  visible: boolean;
  /** 취소 탭·딤 탭·Android back — 아무 변화 없이 닫기 */
  onClose: () => void;
  /** 내 영상 여부 — 공개 범위·삭제(내 영상) vs 신고(타인 영상) 분기 */
  mine: boolean;
  /** 현재 공개 범위 — 미확보(조회 중·실패)·FRIENDS면 어느 행에도 ✓가 없다 */
  currentVisibility: string | null;
  onSelectVisibility: (visibility: VideoVisibility) => void;
  onDelete: () => void;
  onReport: () => void;
}

/**
 * SOURCE: Figma "도감 — 영상 공개 범위 (더보기)"(node 14856:510) — MSG-431 S2·S3.
 * 도감 갤러리와 격자 상세가 **같은 시트를 재사용**한다 — 진입점이 둘이어도 영상에 할 수
 * 있는 일은 하나의 목록이어야 하기 때문이고, `mine`으로만 갈라진다.
 *
 * 내 영상: "공개 범위" 섹션 라벨 + 전체 공개/나만 보기 2행(현재 상태에만 ✓) + 구분선 +
 * "영상 삭제"(빨간 글씨). 타인 영상: "신고하기" 1행.
 * 딤·시트 쉘·취소 버튼·홈 인디케이터 인셋은 `ui-native/ActionSheet`가 소유한다.
 *
 * **행에 아이콘을 지정하지 않는 것이 정본이다** — Figma 14856:515/518/521은 텍스트만이며,
 * 아이콘을 쓰는 `grid-detail/more-menu-sheet`(격자 단위 메뉴, MSG-431에서 제거)와 다르다.
 */
export const VideoMoreSheet = ({
  visible,
  onClose,
  mine,
  currentVisibility,
  onSelectVisibility,
  onDelete,
  onReport,
}: VideoMoreSheetProps) => {
  const insets = useSafeAreaInsets();

  return (
    <ActionSheet
      visible={visible}
      onClose={onClose}
      bottomInset={insets.bottom}
    >
      {mine ? (
        <>
          <ActionSheetSectionLabel label="공개 범위" />
          {VISIBILITY_OPTIONS.map((option) => (
            <ActionSheetItem
              key={option.value}
              label={option.label}
              selected={currentVisibility === option.value}
              onPress={() => onSelectVisibility(option.value)}
            />
          ))}
          <ActionSheetDivider />
          <ActionSheetItem label="영상 삭제" danger onPress={onDelete} />
        </>
      ) : (
        <ActionSheetItem label="신고하기" onPress={onReport} />
      )}
    </ActionSheet>
  );
};
