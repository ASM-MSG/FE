import { Text, View } from "react-native";
import { Button } from "@fillmap/ui-native";
import {
  filterGalleryVideos,
  formatGallerySubtitle,
  type GalleryScope,
} from "../model/gallery-scope";
import { MOCK_GALLERY_VIDEOS } from "../model/mock-gallery";

interface GalleryViewProps {
  scope: GalleryScope;
  /** 스코프 모드 하단 "갤러리 전체 보기" 버튼 — 전체 모드 전환 (AC 7) */
  onShowAll: () => void;
}

/**
 * SOURCE: Figma "개인 도감 — 지역 갤러리" (node 14094:4779) — MSG-300.
 * 타이틀 + 스코프 부제 + 3열 썸네일 그리드. 썸네일은 무라벨 dashed 플레이스홀더
 * (추정 3 — 시안 "Image" 라벨은 플레이스홀더, 실이미지 연동 티켓에서 교체 검토)
 * 이며 탭 무동작(AC 11)이라 View로 둔다. 전체 모드에서도 타이틀은 "지역별 갤러리"
 * 유지(추정 6), 하단 버튼은 스코프 모드 전용(AC 7). 전량 렌더(최대 19개)라
 * ScrollView 내 map — 페이지네이션은 제외 범위.
 */
export const GalleryView = ({ scope, onShowAll }: GalleryViewProps) => {
  const videos = filterGalleryVideos(MOCK_GALLERY_VIDEOS, scope);

  return (
    <>
      <Text className="mt-md text-fm-title text-foreground">지역별 갤러리</Text>
      <Text className="mt-xxs text-fm-body text-foreground-muted">
        {formatGallerySubtitle(scope, videos.length)}
      </Text>
      {/* 3열 그리드 (추정 4) — 셀 p-xxs가 거터, 컨테이너 -mx-xxs로 콘텐츠 패딩에 정렬 */}
      <View className="-mx-xxs mt-sm flex-row flex-wrap">
        {videos.map((video) => (
          <View key={video.id} className="w-1/3 p-xxs">
            <View className="aspect-square rounded-md border border-dashed border-border bg-surface" />
          </View>
        ))}
      </View>
      {scope.mode === "region" ? (
        <Button
          text="갤러리 전체 보기"
          variant="primary"
          size="lg"
          shape="pill"
          className="mt-md w-full"
          onPress={onShowAll}
        />
      ) : null}
    </>
  );
};
