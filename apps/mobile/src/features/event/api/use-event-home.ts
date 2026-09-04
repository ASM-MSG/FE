import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { palette, semantic } from "@fillmap/design-tokens";
import type { GridCellIndex, LatLng } from "../../../entities/cell/model/grid";
import { uploadFlowStore } from "../../upload/model/upload-flow-store";
import {
  deriveSheetState,
  type SheetState,
} from "../../map-home/model/home-sheet-state";
import type { SheetStage } from "../../map-home/model/sheet-snap";
import { toEventCardViews, type EventCardView } from "../model/event-card";
import {
  eventLocationGridNotice,
  eventLocationMetaLine,
  eventLocationSectionTitle,
  eventLocationTypeLabel,
  toEventLocationSelection,
  type EventLocationSelection,
  refreshEventLocationSelection,
} from "../model/event-location";
import {
  eventBaseCells,
  eventCellMembership,
  eventLocationAccent,
  eventLocationIdAt,
  eventLocationLabel,
  eventLocationsCenter,
} from "../model/event-location-cells";
import {
  eventPeriodLabel,
  toLocationCardViews,
  viewerCountLabel,
  type EventLocationCardView,
} from "../model/event-overview";
import { formatEventPeriod } from "../model/event-period";
import { eventRoomMode } from "../model/event-room-mode";
import {
  activateEvent,
  deactivateEvent,
  eventSheetStage,
  getEventSelection,
  openEventRoom,
  selectEventLocation,
  selectEventVideo,
  stepBackEvent,
  useEventSelection,
  type EventRoomSelection,
} from "../model/event-selection";
import {
  toEventVideoCardViews,
  type EventVideoCardView,
} from "../model/event-video-card";
import {
  eventStatusBadge,
  isArchivedEventStatus,
  type EventStatusBadge,
} from "../model/event-status";
import { useKstToday } from "../model/use-kst-today";
import { useEventHeartbeat } from "./use-event-heartbeat";
import { useEventOccurrencesQuery } from "./use-event-occurrences-query";
import { useEventRoomQuery } from "./use-event-room-query";
import { videoSheetInput, type EventVideoInput } from "./use-event-video-sheet";
import { useLocationVideosQuery } from "./use-location-videos-query";
import { useViewerCountQuery } from "./use-viewer-count-query";

interface EventHomeInput {
  bounds: Parameters<typeof useEventOccurrencesQuery>[0];
  /** 카메라 이동 — 개요 진입 시 위치 중심으로 1회 (D13). GridMap ref는 화면이 감싼다 */
  moveTo: (center: LatLng) => void;
  /** 칩 활성 시 테마·미션·격자 선택 해제 (D5) — 상호 배타는 뷰 레이어 배선 */
  onActivate: () => void;
  /** 업로드 플로우 진입 — 라우터는 화면이 소유한다(RN 경계) [MSG-560 D11] */
  onUpload: () => void;
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
  /** `● N명 보는 중` — 0은 값, 조회 실패·캐시 장애(null)는 미표시 (MSG-560 D9) */
  viewerLabel: string | null;
  /** loading / error / list — 상세·위치가 둘 다 도착해야 list (D11) */
  state: SheetState;
  retry: () => void;
}

/** 위치 상세 시트 재료 (MSG-560 D4~D6·D8) — 위치가 선택돼 있을 때만 존재 */
export interface EventLocationView {
  snapshot: EventLocationSelection;
  /** 헤더 유형 pill */
  typeLabel: string;
  /** `영상 N · 운영시간`(운영시간 null이면 `영상 N`) */
  metaLine: string;
  /** `이 위치의 행사 격자 N개` */
  gridNotice: string;
  /** `{위치명 앞토막} 현장 영상` */
  sectionTitle: string;
  /** 영상 유무 분기 — 종료 행사도 같은 판정을 탄다 (D7) */
  mode: "videos" | "empty";
  /** 종료 행사 열람 — 업로드 버튼·CTA를 억제한다 (D8) */
  readOnly: boolean;
  videos: EventVideoCardView[];
  /** loading / error / list — 첫 페이지 게이트, 부분 렌더 없음 (D4) */
  state: SheetState;
  retry: () => void;
  hasNext: boolean;
  loadMore: () => void;
  isLoadingMore: boolean;
  /** 영상 목록은 primary, 빈 상태는 secondary(전폭 CTA가 유일한 primary) [D4] */
  uploadVariant: "primary" | "secondary";
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
  /** 위치 상세 시트 재료 — 위치 미선택이면 null (MSG-560 D4) */
  location: EventLocationView | null;
  /** 현장 영상 시트 입력 (MSG-562 D13) — 상세·댓글은 `use-event-video-sheet`가 소유. 미선택이면 null */
  video: EventVideoInput | null;
  /** 선택 위치의 강조 셀 (D3) — 미선택이면 undefined(기존 렌더 불변) */
  accentCells: GridCellIndex[] | undefined;
  /** 강조 색 `theme-festival` — 셀과 같은 수명 (D3) */
  accentColor: string | undefined;
  /** 선택 위치 이름표 1개 (D3) — 미선택이면 undefined */
  mapLabel: { text: string; coord: LatLng; color: string } | undefined;
  /** 이벤트 모드일 때 시트 단계, 아니면 null(화면 규칙) (D15) */
  sheetStage: SheetStage | null;
  handlers: {
    toggleChip: () => void;
    selectEvent: (selection: EventRoomSelection) => void;
    /** 개요의 위치 행 탭 — 위치 상세로 (MSG-560 D10) */
    selectLocation: (locationId: number) => void;
    /** 지도 셀 탭 — 소속 위치가 있으면 위치 상세로, 없으면 무동작 (MSG-560 D2) */
    tapCell: (cell: GridCellIndex) => void;
    /** 위치 상세의 영상 카드 탭 — 현장 영상 상세로 (MSG-562 D12) */
    selectVideo: (videoId: number) => void;
    /** 위치 상세의 업로드 버튼 2곳 — 행사 귀속 모드로 업로드 플로우를 연다 (D11) */
    openUpload: () => void;
    /** `‹`·하드웨어 백 — 소비했으면 true (D14) */
    back: () => boolean;
    close: () => void;
  };
}

/**
 * 지도 홈 이벤트 조립 훅 (MSG-557) — 화면의 유일한 진입점. 조회 3종·선택 상태·파생을
 * 여기서 끝내고 화면은 훅 호출 한 번과 prop 배선만 남긴다(MSG-428 G3 선례 — 화면 diff 예산).
 * 지도 SDK·라우터를 import하지 않는다(RN 경계) — 카메라·업로드 이동은 콜백 주입.
 * MSG-560: 위치 슬롯·위치 영상·시청 인원 폴링·heartbeat·지도 강조/라벨·업로드 귀속까지
 * 여기서 조립한다. MSG-562: 영상 슬롯(`video`)만 노출 — 상세·댓글·뮤테이션은 `use-event-video-sheet`.
 * 후속 확장점: 익명 heartbeat(`X-Viewer-Session` RN 저장소 어댑터).
 */
export const useEventHome = ({
  bounds,
  moveTo,
  onActivate,
  onUpload,
}: EventHomeInput): EventHome => {
  const selection = useEventSelection();
  const today = useKstToday();
  const occurrences = useEventOccurrencesQuery(bounds);
  const occurrenceId = selection.room?.occurrenceId ?? null;
  const room = useEventRoomQuery(occurrenceId);
  const selectedLocation = selection.location;
  const videos = useLocationVideosQuery(
    selectedLocation === null || occurrenceId === null
      ? null
      : { occurrenceId, locationId: selectedLocation.locationId },
  );
  // 인원은 개요가 보일 때만 폴링하고, heartbeat는 방이 열려 있는 동안 보낸다 (D9)
  const { viewerCount } = useViewerCountQuery(
    occurrenceId,
    selectedLocation === null,
  );
  // 영상 재생·업로드로 push되면 /home은 마운트가 유지된 채 가려진다 — 그 동안은 열람이 아니므로
  // heartbeat를 멈춘다. occurrenceId만으론 구분이 안 된다 (codex 리뷰 P2)
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEventHeartbeat(focused ? occurrenceId : null);

  // 최신 콜백·데이터 참조 — 화면이 매 렌더 새 함수를 넘겨도 핸들러·카메라 효과가 재생성되지 않는다
  const snapshot = {
    moveTo,
    onActivate,
    onUpload,
    room: selection.room,
    location: selectedLocation,
    locations: room.locations,
    title: room.detail?.title ?? selection.room?.title ?? "",
  };
  const latest = useRef(snapshot);
  useEffect(() => {
    latest.current = snapshot;
  });

  const cards = useMemo(
    () => toEventCardViews(occurrences.chips, today),
    [occurrences.chips, today],
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

  const accentCells = useMemo(
    () =>
      selectedLocation === null
        ? undefined
        : eventLocationAccent(room.locations, selectedLocation.locationId),
    [room.locations, selectedLocation],
  );

  // 강조 층과 겹치지 않는 나머지 위치 셀 — 같은 셀에 두 색이 포개지면 색이 섞인다 (D3)
  const overlayCells = useMemo(
    () =>
      occurrenceId === null
        ? null
        : eventBaseCells(room.locations, accentCells ?? []),
    [occurrenceId, room.locations, accentCells],
  );

  const mapLabel = useMemo(() => {
    if (selectedLocation === null) return undefined;
    const dto = room.locations.find(
      (item) => item.locationId === selectedLocation.locationId,
    );
    return dto === undefined ? undefined : eventLocationLabel(dto);
  }, [room.locations, selectedLocation]);

  /** 위치 행 탭·지도 셀 탭이 공유하는 선택 경로 — 스냅숏은 원본 DTO에서 만든다 (D1) */
  const selectLocationById = (locationId: number): void => {
    const dto = latest.current.locations.find(
      (item) => item.locationId === locationId,
    );
    if (dto === undefined) return;
    selectEventLocation(toEventLocationSelection(dto));
  };

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
      selectLocation: selectLocationById,
      tapCell: (cell) => {
        const locationId = eventLocationIdAt(
          eventCellMembership(latest.current.locations),
          cell,
        );
        // 행사 셀이 아니면 무동작 — 이벤트 모드 중 홈 격자 상세를 열지 않는다 (557 유지)
        if (locationId !== null) selectLocationById(locationId);
      },
      selectVideo: selectEventVideo,
      openUpload: () => {
        const { room, location, title, onUpload } = latest.current;
        // 두 버튼 모두 방·위치가 선 상태에서만 렌더된다 — 타입 좁히기용 가드
        if (room === null || location === null) return;
        uploadFlowStore.setEventTarget({
          occurrenceId: room.occurrenceId,
          locationId: location.locationId,
          occurrenceTitle: title,
          locationName: location.name,
        });
        onUpload();
      },
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
      viewerLabel: viewerCountLabel(viewerCount),
      // 실패를 로딩으로 위장하지 않는다 — 어느 조회든 실패면 재시도 행 (D11)
      state: room.isError
        ? "error"
        : room.isPending || detail === null
          ? "loading"
          : "list",
      retry: room.retry,
    };
  })();

  const location = ((): EventLocationView | null => {
    if (selectedLocation === null) return null;
    // 상세 status가 정본 — 도착 전에는 칩 2값으로 위장하지 않고 활성으로 둔다(웹과 동일)
    const readOnly =
      room.detail !== null && isArchivedEventStatus(room.detail.status);
    const mode = eventRoomMode({
      status: room.detail?.status ?? "LIVE",
      selectedLocationId: selectedLocation.locationId,
      hasLocationVideos: videos.hasLocationVideos,
    });
    // 업로드·재조회 후 videoCount 등 표시 메타는 최신 DTO를 따른다 (codex 리뷰 P2)
    const current = refreshEventLocationSelection(
      selectedLocation,
      room.locations,
    );
    return {
      snapshot: current,
      typeLabel: eventLocationTypeLabel(current.type),
      metaLine: eventLocationMetaLine(current),
      gridNotice: eventLocationGridNotice(current.gridCount),
      sectionTitle: eventLocationSectionTitle(current.name),
      // 위치 선택 중 mode는 videos/empty뿐이다 (eventRoomMode 판정 — 타입 좁히기)
      mode: mode === "videos" ? "videos" : "empty",
      readOnly,
      videos: toEventVideoCardViews(videos.videos ?? []),
      // 첫 페이지 실패만 전면 실패, 이어받기 실패는 목록을 유지한다 (D13)
      state: videos.isError ? "error" : videos.isPending ? "loading" : "list",
      retry: videos.retry,
      hasNext: videos.hasNext,
      loadMore: videos.loadMore,
      isLoadingMore: videos.isLoadingMore,
      uploadVariant: videos.hasLocationVideos ? "primary" : "secondary",
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
    location,
    video: videoSheetInput(selection.video, selectedLocation, snapshot.title),
    accentCells,
    accentColor: accentCells ? palette["theme-festival"] : undefined,
    mapLabel,
    sheetStage: selection.active ? eventSheetStage(selection) : null,
    handlers,
  };
};
