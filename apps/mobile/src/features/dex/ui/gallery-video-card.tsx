import { Text, View } from "react-native";
import { VideoCard } from "@fillmap/ui-native";
import type { CollectedVideo } from "../../../entities/dex/model/dex";
import { formatDuration } from "../../../shared/format";
import { formatCollectedAt, formatSeqLabel } from "../model/dex-format";

interface GalleryVideoCardProps {
  video: CollectedVideo;
  /** 그룹 내 표시 순번 — Figma "#4" 표기 (최신이 큰 번호) */
  seq: number;
  /** 최근 24시간 수집 여부 — NEW 배지 (판정은 isNewVideo, L7) */
  isNew: boolean;
}

/**
 * SOURCE: Figma "개인 도감 — 동 갤러리"(node 14799:26373) 영상 카드 — MSG-425 S8.
 * 풀폭 썸네일(중앙 재생 원 + 우하단 m:ss) + 메타 **한 줄**("#N" 칩 · "{상대시간} 수집" ·
 * 우측 NEW 배지). Figma가 메타를 2줄이 아닌 1줄로 그리므로 `VideoCard`의 `title` 슬롯에
 * 노드를 주입하고 `meta`는 지정하지 않는다.
 *
 * **[MSG-431 확장 지점] 내 영상 관리(공개 범위 전환·삭제)는 이 파일 한 곳만 고치면 된다** —
 * `VideoCard`의 이미 열려 있는 `overlay` prop(MSG-421 비파괴 확장)에 ⋯ 버튼을 얹고
 * `ActionSheet`(MSG-420 승격분)를 열면 된다. `ui-native`·셸·갤러리 뷰는 무수정이다.
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
}: GalleryVideoCardProps) => (
  <VideoCard
    src={video.thumbnailUrl ?? undefined}
    durationLabel={formatDuration(video.durationSec)}
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
            <Text className="text-fm-caption text-primary-foreground">NEW</Text>
          </View>
        )}
      </View>
    }
  />
);
