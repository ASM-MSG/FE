import { Upload } from "lucide-react";
import { Fab, MapIconButton, ZoomControl } from "@fillmap/ui-web";

interface MapControlsProps {
  /** 업로드 모달 열기 (콜백 주입 — RN 경계) */
  onUpload: () => void;
  /** 현재 위치(폴백 시 서면)로 재이동 */
  onLocate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

/**
 * 우하단 컨트롤 스택 — 위→아래: 업로드 FAB → 현재 위치 → 줌 +/−.
 * 네비게이션·지도 명령은 모두 콜백 주입(RN 경계).
 */
export const MapControls = ({
  onUpload,
  onLocate,
  onZoomIn,
  onZoomOut,
}: MapControlsProps) => (
  <div className="flex flex-col items-center gap-sm">
    <Fab
      aria-label="업로드"
      icon={<Upload className="size-5" />}
      onClick={onUpload}
    />
    <MapIconButton icon="locate" onClick={onLocate} />
    <ZoomControl onZoomIn={onZoomIn} onZoomOut={onZoomOut} />
  </div>
);
