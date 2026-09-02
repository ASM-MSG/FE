import { useEffect, useMemo, useRef } from "react";
import { semantic } from "@fillmap/design-tokens";
import type { GridCellIndex, LatLng } from "../../../entities/cell/model/grid";
import {
  deriveSheetState,
  type SheetState,
} from "../../map-home/model/home-sheet-state";
import type { SheetStage } from "../../map-home/model/sheet-snap";
import { toEventCardViews, type EventCardView } from "../model/event-card";
import {
  eventLocationCells,
  eventLocationsCenter,
} from "../model/event-location-cells";
import {
  eventPeriodLabel,
  toLocationCardViews,
  type EventLocationCardView,
} from "../model/event-overview";
import { formatEventPeriod } from "../model/event-period";
import {
  activateEvent,
  deactivateEvent,
  eventSheetStage,
  getEventSelection,
  openEventRoom,
  stepBackEvent,
  useEventSelection,
  type EventRoomSelection,
} from "../model/event-selection";
import {
  eventStatusBadge,
  isArchivedEventStatus,
  type EventStatusBadge,
} from "../model/event-status";
import { useKstToday } from "../model/use-kst-today";
import { useEventOccurrencesQuery } from "./use-event-occurrences-query";
import { useEventRoomQuery } from "./use-event-room-query";

interface EventHomeInput {
  bounds: Parameters<typeof useEventOccurrencesQuery>[0];
  /** 카메라 이동 — 개요 진입 시 위치 중심으로 1회 (D13). GridMap ref는 화면이 감싼다 */
  moveTo: (center: LatLng) => void;
  /** 칩 활성 시 테마·미션·격자 선택 해제 (D5) — 상호 배타는 뷰 레이어 배선 */
  onActivate: () => void;
}

/** 개요 시트 재료 — 방이 열려 있을 때만 존재 */
export interface EventOverview {
  occurrenceId: number;
  /** 상세 도착 전엔 칩 제목 폴백 */
  title: string;
  /** 상태 배지 — 상세 status 4값이 정본, 도착 전 null */
  badge: EventStatusBadge | null;
  /** 종료 회차는 연도 포함(`formatEventPeriod`) — 상세 도착 전 null */
  periodLabel: string | null;
  cards: EventLocationCardView[];
  /** loading / error / list — 상세·위치가 둘 다 도착해야 list (D11) */
  state: SheetState;
  retry: () => void;
}

export interface EventHome {
  /** 행사 1건 이상이거나 이벤트 모드가 활성인 동안 칩을 그린다 (D4) */
  chipVisible: boolean;
  active: boolean;
  cards: EventCardView[];
  listState: SheetState;
  retryList: () => void;
  overview: EventOverview | null;
  /** 개요가 열린 동안 전 위치 셀 (D12) — 닫히면 null(테마 층으로 폴백) */
  overlayCells: GridCellIndex[] | null;
  /** 개요가 열린 동안 `semantic.primary` — 셀과 같은 수명 */
  overlayColor: string | undefined;
  /** 이벤트 모드일 때 시트 단계, 아니면 null(화면 규칙) (D15) */
  sheetStage: SheetStage | null;
  handlers: {
    toggleChip: () => void;
    selectEvent: (selection: EventRoomSelection) => void;
    /** `‹`·하드웨어 백 — 소비했으면 true (D14) */
    back: () => boolean;
    close: () => void;
  };
}

/**
 * 지도 홈 이벤트 조립 훅 (MSG-557) — 화면의 유일한 진입점. 조회 3종·선택 상태·파생을
 * 여기서 끝내고 화면은 훅 호출 한 번과 prop 배선만 남긴다(MSG-428 G3 선례 — 화면 diff 예산).
 * 지도 SDK·라우터를 import하지 않는다(RN 경계) — 카메라는 콜백 주입.
 * 2단계 확장점: overview에 viewerCount 폴링·heartbeat(웹 MSG-517), location 슬롯.
 */
export const useEventHome = ({
  bounds,
  moveTo,
  onActivate,
}: EventHomeInput): EventHome => {
  const selection = useEventSelection();
  const today = useKstToday();
  const occurrences = useEventOccurrencesQuery(bounds);
  const occurrenceId = selection.room?.occurrenceId ?? null;
  const room = useEventRoomQuery(occurrenceId);

  // 최신 콜백 참조 — 화면이 매 렌더 새 함수를 넘겨도 핸들러·카메라 효과가 재생성되지 않는다
  const latest = useRef({ moveTo, onActivate });
  useEffect(() => {
    latest.current = { moveTo, onActivate };
  });

  const cards = useMemo(
    () => toEventCardViews(occurrences.chips, today),
    [occurrences.chips, today],
  );

  const overlayCells = useMemo(
    () => (occurrenceId === null ? null : eventLocationCells(room.locations)),
    [occurrenceId, room.locations],
  );

  // 카메라 이동은 방당 1회 — 위치 도착 후 (D13). 방을 닫으면 다음 open에 다시 이동한다
  const center = useMemo(
    () => eventLocationsCenter(room.locations),
    [room.locations],
  );
  const movedForRef = useRef<number | null>(null);
  useEffect(() => {
    if (occurrenceId === null) {
      movedForRef.current = null;
      return;
    }
    if (center === null || movedForRef.current === occurrenceId) return;
    movedForRef.current = occurrenceId;
    latest.current.moveTo(center);
  }, [occurrenceId, center]);

  const handlers = useMemo<EventHome["handlers"]>(
    () => ({
      toggleChip: () => {
        if (getEventSelection().active) {
          deactivateEvent();
          return;
        }
        activateEvent();
        latest.current.onActivate();
      },
      selectEvent: ({ occurrenceId, title, status }) =>
        openEventRoom({ occurrenceId, title, status }),
      back: stepBackEvent,
      close: deactivateEvent,
    }),
    [],
  );

  const overview = ((): EventOverview | null => {
    if (selection.room === null) return null;
    const { detail } = room;
    const periodLabel = detail
      ? isArchivedEventStatus(detail.status)
        ? formatEventPeriod(detail.startsAt, detail.endsAt)
        : eventPeriodLabel(detail.startsAt, detail.endsAt)
      : null;
    return {
      occurrenceId: selection.room.occurrenceId,
      title: detail?.title ?? selection.room.title,
      // 배지는 상세 status 4값이 정본 — 칩 2값으로 먼저 그리면 종료 회차가 잠시 활성으로 위장된다
      badge: detail && eventStatusBadge(detail.status, detail.startsAt, today),
      periodLabel,
      cards: toLocationCardViews(room.locations),
      // 실패를 로딩으로 위장하지 않는다 — 어느 조회든 실패면 재시도 행 (D11)
      state: room.isError
        ? "error"
        : room.isPending || detail === null
          ? "loading"
          : "list",
      retry: room.retry,
    };
  })();

  return {
    chipVisible: cards.length > 0 || selection.active,
    active: selection.active,
    cards,
    listState: deriveSheetState([occurrences], cards.length),
    retryList: occurrences.retry,
    overview,
    overlayCells,
    overlayColor: overlayCells ? semantic.primary : undefined,
    sheetStage: selection.active ? eventSheetStage(selection) : null,
    handlers,
  };
};
