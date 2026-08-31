import { useCallback, useEffect, useMemo } from "react";
import {
  buildEventGridMembership,
  buildEventLocationCells,
  buildEventLocationLabels,
} from "@/features/event/model/event-location-overlay";
import type { EventRoomSelection } from "@/features/event/model/event-room-store";
import { useEventRoomStore } from "@/features/event/model/event-room-store";
import { useEventLocationsQuery } from "@/features/event/model/use-event-locations-query";
import { useMapOverlayStore } from "@/widgets/map-shell/map-overlay-store";

/**
 * 행사 위치 오버레이 게시 배선 (MSG-517 AC 6·7 — use-ai-route-overlay-publish 선례).
 * **뷰-레이어 훅** — 게시 스토어에 바로 배선하므로 RN 재사용 대상이 아니다.
 *
 * 행사방이 열려 있는 동안 위치 영역 셀·이름 라벨과 격자 클릭 핸들러(membership 조회 →
 * 위치 강조)를 map-overlay-store에 게시하고, 닫힘·언마운트 시 clear로 걷는다 (AC 6).
 * 파생은 순수 함수(event-location-overlay)가, 렌더는 MapCanvas 경계가 맡는다.
 * 클릭은 강조만 한다 — 위치 영상 상세·격자 상세 어느 쪽으로도 진입하지 않는다 (AC 7,
 * 확정 4 — 행사방 열림 상태 한정. 소속 아닌 격자는 grid-click-routing 기존 경로).
 * 게시 중에는 홈 게시 훅(use-home-overlay-publish)이 suspended로 비켜선다 — 게시자
 * 단일화(같은 스토어 필드를 두 effect가 쓰면 마지막 재실행이 상대를 지운다).
 */
export const useEventOverlayPublish = (
  room: EventRoomSelection | null,
): void => {
  const highlightedLocationId = useEventRoomStore(
    (s) => s.highlightedLocationId,
  );
  const highlightLocation = useEventRoomStore((s) => s.highlightLocation);
  const setCells = useMapOverlayStore((s) => s.setCells);
  const setLabels = useMapOverlayStore((s) => s.setLabels);
  const setOnCellClick = useMapOverlayStore((s) => s.setOnCellClick);
  const clearOverlays = useMapOverlayStore((s) => s.clear);

  // 개요 패널·MapShell 라우팅과 같은 queryKey — 조회는 1회 (캐시 공유)
  const { locations } = useEventLocationsQuery(room?.occurrenceId ?? null);

  const membership = useMemo(
    () => buildEventGridMembership(locations),
    [locations],
  );
  const cells = useMemo(
    () => buildEventLocationCells(locations, highlightedLocationId),
    [locations, highlightedLocationId],
  );
  const labels = useMemo(
    () =>
      buildEventLocationLabels(
        locations,
        highlightedLocationId,
        room?.title ?? "",
      ),
    [locations, highlightedLocationId, room?.title],
  );

  const handleCellClick = useCallback(
    (cellId: string) => {
      const locationId = membership.get(cellId);
      if (locationId !== undefined) highlightLocation(locationId);
    },
    [membership, highlightLocation],
  );

  useEffect(() => {
    if (room === null) return;
    setCells(cells);
    setLabels(labels);
    setOnCellClick(handleCellClick);
    return () => clearOverlays();
  }, [
    room,
    cells,
    labels,
    handleCellClick,
    setCells,
    setLabels,
    setOnCellClick,
    clearOverlays,
  ]);
};
