import { Upload } from "lucide-react";
import { Fab, MapIconButton, ZoomControl } from "@fillmap/ui-web";
import { scaleLabelForLevel } from "@/features/map-home/model/map-scale";

interface MapControlsProps {
  /** 업로드 모달 열기 (콜백 주입 — RN 경계) */
  onUpload: () => void;
  /** 현재 위치(폴백 시 서면)로 재이동 */
  onLocate: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  /** 현재 카카오맵 줌 레벨 — 뷰포트 스토어 값을 주입(RN 경계). null이면 지도 미준비(로드 전·실패)로 축척을 숨긴다 */
  zoomLevel: number | null;
}

/**
 * 우하단 컨트롤 스택 — 위→아래: 업로드 FAB → 현재 위치 → 줌 +/− → 축척 바.
 * 스택이 우하단 고정이라 축척 바가 맨 아래에 추가되며 기존 컨트롤은 그만큼 위로 밀린다.
 * 축척은 카카오맵 사이트의 눈금 바 표기를 따른다 (레벨 → 거리는 map-scale 모델).
 * 네비게이션·지도 명령은 모두 콜백 주입(RN 경계).
 */
export const MapControls = ({
  onUpload,
  onLocate,
  onZoomIn,
  onZoomOut,
  zoomLevel,
}: MapControlsProps) => (
  <div className="flex flex-col items-end gap-sm">
    {/* 버튼 묶음은 자체 폭(FAB 기준)을 가진 하위 컨테이너로 분리 — 축척 라벨 폭이 변해도 버튼이 밀리지 않는다 */}
    <div className="flex flex-col items-center gap-sm">
      <Fab
        aria-label="업로드"
        icon={<Upload className="size-5" />}
        onClick={onUpload}
      />
      <MapIconButton icon="locate" onClick={onLocate} />
      <ZoomControl onZoomIn={onZoomIn} onZoomOut={onZoomOut} />
    </div>
    {/* 카카오맵식 축척 바 — 눈금 브래킷(장식) + 거리 라벨. role=status로 줌 변경을 스크린 리더에도 알린다.
        지도 미준비(폴백) 상태에서는 없는 지도의 축척을 주장하지 않도록 숨긴다 */}
    {zoomLevel !== null && (
      <p
        role="status"
        aria-label={`지도 축척 ${scaleLabelForLevel(zoomLevel)}`}
        className="flex items-end gap-xxs"
      >
        <span
          aria-hidden="true"
          className="h-xs w-16 border-b-2 border-l-2 border-r-2 border-foreground"
        />
        <span className="text-fm-caption font-medium text-foreground">
          {scaleLabelForLevel(zoomLevel)}
        </span>
      </p>
    )}
  </div>
);
