import { useState } from "react";
import { Text, View } from "react-native";
import { VideoCard } from "@fillmap/ui-native";
import type { CollectedVideo } from "../../../entities/dex/model/dex";
import { formatDuration } from "../../../shared/format";
import { goToVideoPlayback } from "../../../shared/navigation";
import { VideoActionsMenu } from "../../video-actions/ui/video-actions-menu";
import { VideoMoreButton } from "../../video-actions/ui/video-more-button";
import { formatCollectedAt, formatSeqLabel } from "../model/dex-format";

interface GalleryVideoCardProps {
  video: CollectedVideo;
  /** 그룹 내 표시 순번 — Figma "#4" 표기 (최신이 큰 번호) */
  seq: number;
  /** 최근 24시간 수집 여부 — NEW 배지 (판정은 isNewVideo, L7) */
  isNew: boolean;
  /** 격자 라벨 — 삭제 확인 카드 제목 "서면 A-02 · 1:24"의 격자명 출처 (MSG-431) */
  gridLabel: string;
}

/**
 * SOURCE: Figma "개인 도감 — 동 갤러리"(node 14799:26373) 영상 카드 — MSG-425 S8.
 * 풀폭 썸네일(중앙 재생 원 + 우하단 m:ss) + 메타 **한 줄**("#N" 칩 · "{상대시간} 수집" ·
 * 우측 NEW 배지). Figma가 메타를 2줄이 아닌 1줄로 그리므로 `VideoCard`의 `title` 슬롯에
 * 노드를 주입하고 `meta`는 지정하지 않는다.
 *
 * **[MSG-431 이행 완료] 내 영상 관리(공개 범위 전환·삭제)** — 예고대로 `VideoCard`의
 * `overlay` prop(MSG-421 비파괴 확장)에 ⋯ 버튼을 얹고, 시트·삭제 다이얼로그·서버 호출은
 * `features/video-actions`의 `VideoActionsMenu` 하나가 소유한다(격자 상세와 같은 시트).
 * `ui-native`·도감 셸은 무수정이며, 갤러리 뷰는 `gridLabel` 1줄만 늘었다(삭제 카드 제목).
 * 도감 갤러리는 정의상 전부 내 영상이라(`GET /api/collections/videos`) `mine`은 상수 true다.
 *
 * **[MSG-446 이행 완료] 탭(재생) 배선** — 예고대로다. MSG-425가 `onPress`를 보류한 이유는
 * "모바일에는 웹의 `widgets/video-mini-panel`도 재생 화면도 라우트도 없다"였고(목적지 없는
 * `onPress`는 `VideoCard`가 `accessibilityRole="button"`을 켜 아무 일도 안 하는 **가짜 버튼**을
 * 스크린리더에 노출시킨다 — MSG-421 실기 검증이 잡았고 MSG-423이 같은 이유로 기각한 지점),
 * MSG-446이 `/video/[videoId]`를 만들어 그 전제를 없앴다. 웹이 미니 패널을 여는 자리에서
 * 모바일은 **화면을 push**한다 — 뒤로 갔을 때 갤러리 스크롤이 유지되는 경로다.
 * 도감 갤러리는 정의상 전부 내 영상이라 `mine`은 여기서도 상수 true다.
 *
 * 재생 원은 `VideoCard` 기본값(흰 원 + 파란 삼각)을 유지한다 — Figma는 파란 원 + 흰
 * 삼각이지만 앱 카드 관례를 우선한다(승인 Q2, 오탐 방지 11). 통일은 카드 3종을 함께
 * 이관하는 별도 티켓 몫이다.
 * NEW 배지는 썸네일 오버레이가 아니라 메타 줄 우측 끝이다 — Figma 실측 그대로(오탐 방지 10).
 * 순번 칩·NEW 배지는 사용처가 이 파일뿐이라 로컬 인라인이다(`CellBadge`는 지도 격자 라벨 계약).
 */
export const GalleryVideoCard = ({
  video,
  seq,
  isNew,
  gridLabel,
}: GalleryVideoCardProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <VideoCard
        src={video.thumbnailUrl ?? undefined}
        durationLabel={formatDuration(video.durationSec)}
        overlay={
          <VideoMoreButton
            onPress={() => setMenuOpen(true)}
            className="absolute right-xs top-xs"
          />
        }
        accessibilityLabel={`${gridLabel} ${formatSeqLabel(seq)} 영상, ${formatDuration(video.durationSec)}`}
        onPress={() => goToVideoPlayback(video.videoId, true)}
        title={
          <View className="flex-row items-center gap-xs">
            <View className="rounded-xs bg-surface px-1.5 py-0.5">
              <Text className="text-fm-caption text-foreground-muted">
                {formatSeqLabel(seq)}
              </Text>
            </View>
            <Text
              numberOfLines={1}
              className="min-w-0 flex-1 text-fm-label text-foreground-muted"
            >
              {formatCollectedAt(video.createdAt)}
            </Text>
            {isNew && (
              <View className="rounded-xs bg-primary px-1.5 py-0.5">
                <Text className="text-fm-caption text-primary-foreground">
                  NEW
                </Text>
              </View>
            )}
          </View>
        }
      />

      <VideoActionsMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        mine
        target={{
          videoId: video.videoId,
          gridId: video.gridId,
          thumbnailUrl: video.thumbnailUrl ?? null,
          durationSec: video.durationSec,
          createdAt: video.createdAt,
          gridLabel,
        }}
      />
    </>
  );
};
