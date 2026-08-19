import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { LayoutGrid } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import type { RecentRegion } from "../../../entities/dex/model/dex";
import {
  formatGallerySummary,
  formatGroupVideoCount,
} from "../model/dex-format";
import { groupVideosByGrid } from "../model/gallery-groups";
import { shortRegionName } from "../model/region-label";
import { useGridRegionStatQuery } from "../model/use-region-stat-query";
import { useRegionVideosQuery } from "../model/use-region-videos-query";
import { isNewVideo } from "../model/video-new";
import { DexErrorState } from "./dex-error-state";
import { GalleryVideoCard } from "./gallery-video-card";

interface RegionGalleryViewProps {
  /** 표시 동 — 동 행 탭으로 선택된 항목(대표 격자 id가 by-grid 조인 입력) */
  selection: RecentRegion;
  /** "전체 보기 ›" — 동 목록으로 복귀 */
  onViewAll: () => void;
}

/**
 * SOURCE: Figma "개인 도감 — 동 갤러리"(node 14799:26373) — MSG-425 S6·S7·S11·S12.
 * "지역별 갤러리" 섹션 헤더 + "{동} · 격자 N개 · 영상 N개" 요약 + 격자별 섹션 + 1열 영상 카드.
 *
 * 조회는 2단이다: 선택 동의 대표 격자로 `by-grid`를 물어 regionCode를 얻고(명세에
 * regionCode가 없는 갭을 메운다), 그 코드로 `collections/videos`를 조회한다. 그래서
 * 상태 분기도 두 쿼리를 합쳐 본다 — 코드 조회 실패도 갤러리 실패다.
 *
 * `by-grid`는 조회 성공이어도 `data: null`(격자 중심이 행정동 밖·미판정)을 돌려줄 수 있다.
 * 그러면 regionCode가 없어 영상 쿼리가 비활성이고 pending·error 어느 쪽도 아니라, 처리하지
 * 않으면 로딩이 영원히 남는다 — `regionUnresolved` 분기가 그 경로를 안내 문구로 종결한다 (S12).
 */
export const RegionGalleryView = ({
  selection,
  onViewAll,
}: RegionGalleryViewProps) => {
  const stat = useGridRegionStatQuery(selection.sampleGridId);
  const videos = useRegionVideosQuery(stat.data?.regionCode ?? null);

  const isPending = stat.isPending || videos.isPending;
  const isError = stat.isError || videos.isError;
  const retry = stat.isError ? stat.retry : videos.retry;
  const regionUnresolved =
    !stat.isPending && !stat.isError && stat.data === null;

  // 격자 라벨 폴백(구역 밖 격자)과 요약은 축약명을 쓴다 — 원문은 전체 경로라 잘린다
  const regionLabel = shortRegionName(selection.regionName);
  const groups = videos.data ? groupVideosByGrid(videos.data, regionLabel) : [];
  // NEW 판정 기준 시각 — 렌더 시점 1회로 고정해 그룹 간 판정이 엇갈리지 않게 한다
  const now = Date.now();

  return (
    <View className="gap-xxs">
      <View className="flex-row items-center justify-between gap-sm">
        <Text className="text-fm-title text-foreground">지역별 갤러리</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onViewAll}
          className="active:opacity-60"
        >
          <Text className="text-fm-label text-primary">전체 보기 ›</Text>
        </Pressable>
      </View>
      <Text numberOfLines={1} className="text-fm-caption text-foreground-muted">
        {videos.data
          ? formatGallerySummary(regionLabel, groups.length, videos.data.length)
          : regionLabel}
      </Text>

      {isError ? (
        <DexErrorState
          title="갤러리를 불러오지 못했어요"
          description="네트워크 상태를 확인하고 다시 시도해 주세요"
          onRetry={retry}
        />
      ) : regionUnresolved ? (
        <Text className="py-lg text-center text-fm-body text-foreground-muted">
          행정동 정보를 찾지 못해 이 동의 갤러리를 열 수 없어요.
        </Text>
      ) : isPending || !videos.data ? (
        <View className="py-xl">
          <ActivityIndicator color={semantic.primary} />
        </View>
      ) : groups.length === 0 ? (
        <Text className="py-lg text-center text-fm-body text-foreground-muted">
          {regionLabel}에서 수집한 영상이 아직 없어요. 첫 영상을 올려 갤러리를
          채워 보세요.
        </Text>
      ) : (
        <View className="mt-lg gap-md">
          {groups.map((group) => (
            <View key={group.gridId} className="gap-sm">
              {/* 격자 섹션 헤더 — 아이콘 + 격자명 + 여백 rule 선 + 영상 수 */}
              <View className="flex-row items-center gap-xs">
                <LayoutGrid size={14} color={semantic.primary} />
                <Text className="text-fm-body-strong text-foreground">
                  {group.label}
                </Text>
                <View className="h-px flex-1 bg-border" />
                <Text className="text-fm-label text-foreground-muted">
                  {formatGroupVideoCount(group.videos.length)}
                </Text>
              </View>
              {group.videos.map((video, index) => (
                <GalleryVideoCard
                  key={video.videoId}
                  video={video}
                  seq={group.videos.length - index}
                  isNew={isNewVideo(video.createdAt, now)}
                />
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
