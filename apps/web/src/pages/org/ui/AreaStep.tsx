import { useEffect, useRef, useState } from "react";
import { Button } from "@fillmap/ui-web";
import {
  judgeCandidate,
  unionCellCount,
  type AreaRect,
} from "@/features/event-submission/model/submission-area";
import { useSubmissionWizardStore } from "@/features/event-submission/model/submission-wizard-store";
import { stepIndicatorLabel } from "@/features/event-submission/model/submission-wizard";
import { GRID_MIN_ZOOM } from "@/features/map-home/model/grid-overlay";
import { AreaDraftCard } from "./AreaDraftCard";
import { AreaMapCanvas, type AreaMapHandle } from "./AreaMapCanvas";
import { AreaPlaceSearch } from "./AreaPlaceSearch";
import { AreaRectList } from "./AreaRectList";
import { AreaUsageCard } from "./AreaUsageCard";

const SUBTITLE = "시작점을 누른 채 끝점까지 드래그하세요.";
const FOOTNOTE = "저장하면 이 위치의 영역이 확정됩니다.";
const ZOOM_GATE_NOTICE = "격자가 보이는 축척까지 확대해 주세요";

/**
 * 위치 영역 지정 스텝 (MSG-547 — Figma 15525:9300) — 좌측 패널 + 전면 지도.
 * 위저드 스토어를 직접 구독하는 자급 컨테이너다(스위치가 prop 통로가 되지 않게 — 546 관례).
 *
 * 확정 영역은 스토어가 소유하고(스텝을 오가도 보존 — AC 11), **후보(draft)는 이 스텝의
 * 로컬 단일 슬롯**이다: 새 드래그가 기존 후보를 대체하고 스텝을 떠나면 사라진다(추정 7).
 * 판정(스냅·합집합·상한·경고)은 전부 순수 모델(`submission-area`)이 하고 이 파일은 배선만
 * 한다 — 지도 SDK 접근은 `AreaMapCanvas` 안에만 있다.
 *
 * 시안의 지도 위 유저 앱 요소(테마 칩·부산 캡슐·행사 칩·업로드 FAB·현위치 버튼)는
 * 유저 지도 스크린샷 재사용 흔적이라 렌더하지 않는다(스펙 Figma 오탐 방지).
 */
export const AreaStep = () => {
  const areaRects = useSubmissionWizardStore((state) => state.areaRects);
  const addAreaRect = useSubmissionWizardStore((state) => state.addAreaRect);
  const removeAreaRect = useSubmissionWizardStore(
    (state) => state.removeAreaRect,
  );
  const goToStep = useSubmissionWizardStore((state) => state.goToStep);

  const [draftRect, setDraftRect] = useState<AreaRect | null>(null);
  const [zoom, setZoom] = useState(GRID_MIN_ZOOM);
  const mapRef = useRef<AreaMapHandle>(null);

  // Esc — 진행 중 드래그(후보 미생성으로 취소)와 대기 중 후보를 같은 경로로 해제한다 (AC 4).
  // 지도 안쪽 진행 상태는 후보가 null이 되는 것을 보고 canvas가 스스로 끊는다
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDraftRect(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const usedCells = unionCellCount(areaRects);
  const canSave = areaRects.length > 0;

  const confirmDraft = () => {
    if (draftRect === null) return;
    addAreaRect(draftRect);
    setDraftRect(null);
  };

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex w-97 shrink-0 flex-col gap-md overflow-y-auto border-r border-border bg-background p-lg">
        <p className="text-fm-label text-primary">
          {stepIndicatorLabel("area")}
        </p>
        <button
          type="button"
          onClick={() => goToStep("basic")}
          className="self-start text-fm-label text-foreground-muted"
        >
          ‹ 기본 정보
        </button>
        <div className="flex flex-col gap-xxs">
          <h2 className="text-fm-display text-foreground">위치 영역 지정</h2>
          <p className="text-fm-body text-foreground-muted">{SUBTITLE}</p>
        </div>

        <AreaUsageCard usedCells={usedCells} rectCount={areaRects.length} />

        <AreaPlaceSearch
          onMoveTo={(coords) => mapRef.current?.moveTo(coords)}
        />

        {draftRect !== null && (
          <AreaDraftCard
            rect={draftRect}
            judgement={judgeCandidate(areaRects, draftRect)}
            onAdd={confirmDraft}
            onCancel={() => setDraftRect(null)}
          />
        )}

        <AreaRectList rects={areaRects} onRemove={removeAreaRect} />

        <div className="mt-auto flex flex-col gap-xs pt-md">
          <Button
            text="위치 저장"
            className="w-full"
            disabled={!canSave}
            onClick={() => goToStep("review")}
          />
          <p className="text-fm-caption text-foreground-muted">{FOOTNOTE}</p>
        </div>
      </div>

      <div className="relative min-w-0 flex-1">
        <AreaMapCanvas
          ref={mapRef}
          confirmedRects={areaRects}
          draftRect={draftRect}
          onDraftChange={setDraftRect}
          onZoomChange={setZoom}
        />
        {zoom < GRID_MIN_ZOOM && (
          <p
            role="status"
            className="absolute inset-x-0 top-0 z-20 bg-primary px-md py-xs text-center text-fm-body text-primary-foreground"
          >
            {ZOOM_GATE_NOTICE}
          </p>
        )}
      </div>
    </div>
  );
};
