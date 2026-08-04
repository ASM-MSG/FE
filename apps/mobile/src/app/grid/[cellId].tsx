import { useLocalSearchParams } from "expo-router";
import { GridDetailScreen } from "../../features/grid-detail/ui/grid-detail-screen";

/** 격자 상세 (MSG-296 AC 1) — 지도 홈 격자 탭 → Stack push, param = 인코딩 셀 id */
export default function GridDetail() {
  const { cellId } = useLocalSearchParams<{ cellId: string }>();
  return <GridDetailScreen cellId={cellId} />;
}
