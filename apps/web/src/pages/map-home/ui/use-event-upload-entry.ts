import { useEventRoomStore } from "@/features/event/model/event-room-store";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";

/**
 * 뷰-레이어 훅 (MSG-521 AC 1·2, MSG-451 관례) — 행사 업로드 진입 배선.
 * 빈 상태 CTA(EventLocationEmptyState)와 헤더 [+ 영상 올리기](EventLocationHeader)가
 * 공용한다. 행사방·선택 위치는 useEventRoomStore 직접 구독(자급 컨테이너 관례)으로
 * 얻어 `openEventUploadModal`에 넘긴다 — `EventRoomBodySwitch` 무수정(MSG-520 충돌면
 * 회피). 비로그인 게이트는 열기 액션(스토어)이 소유한다 (AC 6).
 * RN 재사용 대상이 아니다 — 페이지 조립 전용.
 */
export const useEventUploadEntry = (): (() => void) => {
  const room = useEventRoomStore((s) => s.room);
  const location = useEventRoomStore((s) => s.location);
  const openEventUploadModal = useUploadModalStore(
    (s) => s.openEventUploadModal,
  );

  return () => {
    // 두 버튼 모두 방·위치 선택 상태에서만 렌더된다 — 타입 좁히기용 가드
    if (room === null || location === null) return;
    openEventUploadModal({
      occurrenceId: room.occurrenceId,
      locationId: location.locationId,
      occurrenceTitle: room.title,
      locationName: location.name,
    });
  };
};
