import { useState } from "react";
import { View } from "react-native";
import { VideoRow } from "@fillmap/ui-native";
import { goToVideoPlayback } from "../../../shared/navigation";
import { VideoActionsMenu } from "../../video-actions/ui/video-actions-menu";
import { VideoMoreButton } from "../../video-actions/ui/video-more-button";
import type { GridVideoRow as GridVideoRowModel } from "../model/grid-videos";

interface GridVideoRowProps {
  row: GridVideoRowModel;
  /** 삭제 대상의 격자 — 삭제 후 격자 계열 무효화 키 */
  gridId: string;
  /** 삭제 확인 카드 제목의 격자 라벨 (예: "서면 A-14") */
  gridLabel: string;
  /** 신고하기 선택 — 신고 모달은 화면이 소유한다 */
  onReport: (row: GridVideoRowModel) => void;
}

/**
 * 격자 상세 "이 격자의 영상" 1행 (MSG-431 신고 배선 결정 2) — `VideoRow` + ⋯ 트리거 +
 * 도감 갤러리와 **같은** 액션 시트(`VideoActionsMenu`).
 * `mine`에 따라 시트가 갈린다 — 내 영상은 공개 범위·삭제, 타인 영상은 신고하기.
 *
 * ⋯는 `VideoRow` 밖 형제로 둔다 — `VideoRow`에 트레일링 슬롯이 없고, ui-native는
 * 이 티켓에서 무수정이 원칙이다(`index.ts` diff 0줄 합의). 행 전체는 `flex-1`로 남는다.
 *
 * **[MSG-446 이행 완료] 행 탭 → 재생 화면.** 이 행은 `VideoRow`가 `onPress` 유무와
 * 무관하게 `accessibilityRole="button"`을 달고 있어 **이미 가짜 버튼으로 낭독되고 있었다**
 * (`VideoCard`와 달리 조건부가 아니었다 — MSG-446이 ui-native 쪽 규칙도 함께 맞췄다).
 * 이제 실제 목적지가 붙어 버튼 낭독이 사실이 된다. 행 이름은 `title`+`meta`
 * ("내 영상"·"@닉네임 · 3시간 전")가 그대로 읽혀 별도 라벨을 주지 않는다.
 */
export const GridVideoRow = ({
  row,
  gridId,
  gridLabel,
  onReport,
}: GridVideoRowProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View className="flex-row items-center gap-xs">
      <VideoRow
        title={row.title}
        meta={row.meta}
        thumbnailSrc={row.thumbnailUrl ?? undefined}
        onPress={() => goToVideoPlayback(row.videoId, row.mine)}
        className="flex-1"
      />
      <VideoMoreButton onPress={() => setMenuOpen(true)} />

      <VideoActionsMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        mine={row.mine}
        target={{
          videoId: row.videoId,
          gridId,
          thumbnailUrl: row.thumbnailUrl,
          durationSec: row.durationSec,
          createdAt: row.recordedAt,
          gridLabel,
        }}
        onReport={() => onReport(row)}
      />
    </View>
  );
};
