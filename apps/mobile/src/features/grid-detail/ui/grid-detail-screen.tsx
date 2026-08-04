import { useMemo, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MoreHorizontal, Share2 } from "lucide-react-native";
import { semantic } from "@fillmap/design-tokens";
import {
  BottomSheet,
  Button,
  MapIconButton,
  VideoRow,
} from "@fillmap/ui-native";
import { GridMap } from "../../map-home/ui/grid-map";
import { deriveCellDetail } from "../model/cell-detail";
import { VideoPreview } from "./video-preview";

/** 상세 지도 줌 — 100m 셀이 Figma(14094:4194)처럼 화면 폭의 1/3 규모로 보이는 수준 */
const DETAIL_ZOOM = 17;

/** 통계 1칸 (AC 7) — Figma 14094:4221 stat 카드. 웹 CellDetailSheet도 로컬 구현 — 승격 안 함 (스펙) */
const Stat = ({ value, label }: { value: string; label: string }) => (
  <View className="flex-1 items-center gap-0.5 rounded-md bg-surface-soft py-sm">
    <Text className="text-fm-title text-foreground">{value}</Text>
    <Text className="text-fm-caption text-foreground-muted">{label}</Text>
  </View>
);

/** 공유·더보기 원형 아이콘 버튼 (AC 6) — Figma 14094:4210/4216, 탭은 no-op 스텁 */
const CircleIconButton = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityHint="아직 준비 중인 기능입니다"
    className="size-9 items-center justify-center rounded-full bg-surface-soft active:opacity-60"
  >
    {children}
  </Pressable>
);

interface GridDetailScreenProps {
  cellId: string;
}

/**
 * 격자 상세 화면 (MSG-296 AC 1~11, Figma 14094:4192) — 상단 지도(선택 격자 점선
 * 강조 + 뒤로 가기) + 고정형 바텀시트(내부 스크롤만 — 추정 3 승인).
 * 서버 연동 없이 mock 파생 모델(deriveCellDetail) 기반. 재생·공유·업로드는 스텁.
 */
export const GridDetailScreen = ({ cellId }: GridDetailScreenProps) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const detail = useMemo(() => deriveCellDetail(cellId), [cellId]);

  // 유일한 진입 경로(지도 탭)는 항상 인코딩 id를 만든다 — 형식 밖 param은 렌더 없음
  if (!detail) return null;

  return (
    <View className="flex-1 bg-surface-elevated">
      {/* 상단 지도 — 시트(top 36%)에 하단이 덮이는 44% 높이라 카메라 중심(22% 지점)이 노출 영역 안에 온다 (AC 2) */}
      <View className="absolute inset-x-0 top-0 h-[44%]">
        <GridMap
          initialCenter={detail.center}
          initialZoom={DETAIL_ZOOM}
          showCellGrid={false}
          showZoomControls={false}
          highlightCell={detail.index}
        />
      </View>

      {/* 뒤로 가기 (AC 3) — Figma 흰 원형·raised 그림자 (스펙 재사용 계획) */}
      <View
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0 px-md"
        style={{ paddingTop: insets.top + 8 }}
      >
        <MapIconButton
          icon="back"
          onPress={() => router.back()}
          className="self-start bg-surface-elevated shadow-raised"
        />
      </View>

      {/* 고정형 상세 시트 (추정 3) — ui-native BottomSheet 쉘 + 내부 스크롤 */}
      <BottomSheet className="absolute inset-x-0 bottom-0 top-[36%]">
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="gap-sm"
          // 시트 쉘 pb-md(16) 위에 홈 인디케이터 인셋만 추가 확보
          contentContainerStyle={{ paddingBottom: insets.bottom }}
        >
          <VideoPreview durationLabel={detail.previewDurationLabel} />

          <View className="flex-row items-center gap-2.5">
            <View className="flex-1 gap-0.75">
              <Text
                numberOfLines={1}
                className="text-fm-display text-foreground"
              >
                {detail.label}
              </Text>
              <Text
                numberOfLines={1}
                className="text-fm-label text-foreground-muted"
              >
                {detail.recentUploadText
                  ? `${detail.location} · ${detail.recentUploadText}`
                  : detail.location}
              </Text>
            </View>
            <CircleIconButton label="공유">
              <Share2 size={18} color={semantic.textPrimary} />
            </CircleIconButton>
            <CircleIconButton label="더보기">
              <MoreHorizontal size={18} color={semantic.textPrimary} />
            </CircleIconButton>
          </View>

          <View className="flex-row gap-xs">
            <Stat value={detail.stats.fillRate} label="담수율" />
            <Stat value={detail.stats.videoCount} label="영상" />
            <Stat value={detail.stats.viewCount} label="조회" />
          </View>

          {/* 업로드 플로우는 MSG-302 — 탭 스텁 (AC 8) */}
          <Button
            text="이 격자에 영상 업로드"
            shape="pill"
            className="w-full"
          />

          <Text className="text-fm-title text-foreground">이 격자의 영상</Text>
          {detail.isEmpty ? (
            <View className="items-center py-lg">
              <Text className="text-fm-body text-foreground-muted">
                이 격자에 아직 업로드된 영상이 없어요
              </Text>
            </View>
          ) : (
            <View className="gap-sm">
              {detail.videos.map((video) => (
                <VideoRow
                  key={video.id}
                  title={video.title}
                  meta={video.meta}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
};
