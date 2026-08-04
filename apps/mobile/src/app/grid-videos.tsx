import { useLocalSearchParams } from "expo-router";
import { GridThumbnailScreen } from "../features/map-home/ui/grid-thumbnail-screen";
import { SEOMYEON_CENTER } from "../shared/geolocation";

/**
 * 격자 썸네일 뷰 (AC 11·13) — 지도 홈이 "전체 보기"/스와이프 업으로 push하며
 * 직전 카메라(lat·lng·zoom)를 파라미터로 넘긴다. 파라미터 없이 열리면 서면 폴백.
 */
export default function GridVideos() {
  const { lat, lng, zoom } = useLocalSearchParams<{
    lat?: string;
    lng?: string;
    zoom?: string;
  }>();

  const center =
    lat && lng ? { lat: Number(lat), lng: Number(lng) } : SEOMYEON_CENTER;

  return (
    <GridThumbnailScreen
      initialCenter={center}
      initialZoom={zoom ? Number(zoom) : undefined}
    />
  );
}
