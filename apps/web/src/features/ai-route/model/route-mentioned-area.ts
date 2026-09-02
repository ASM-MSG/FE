import type { LatLng } from "@/entities/cell";
import { MAP_SCALE_1KM_ZOOM } from "@/features/map-home/model/map-scale";
import type { MentionedAreaDto } from "@/shared/api/generated";
// 조사 판정은 MSG-546(위저드 CTA)이 두 번째 소비처가 되며 shared/format으로 올렸다
import { euroJosa } from "@/shared/format";

/**
 * 언급 지역 자동 이동 판정 + 안내 토스트 문구 (MSG-489 L6~L10).
 * 순수 함수 — 지도 SDK를 모른다(RN 재사용 대상). 명령 실행은 뷰-레이어 훅이 한다.
 *
 * `kind`는 생성 타입상 유니언이 아니라 raw `string`이라 분기하지 않는다(A3):
 * MOVE·ZOOM_OUT을 같은 처리로 통일한 이상(D6), 서버가 신호를 보냈다는 사실 자체가 판정 근거다.
 */
export interface RouteAutoMove {
  center: LatLng;
  /** 축척 1km 단 고정 (D2) — 지역 외접 사각형 fitBounds는 채택하지 않는다 (D6) */
  zoom: number;
  areaName: string;
  /** 서버 신호 종류 — 기록만 하고 분기하지 않는다 (A3) */
  kind: string;
}

export const resolveAutoMove = ({
  mentionedArea,
  alreadyMoved,
}: {
  mentionedArea: MentionedAreaDto | null;
  /** 이번 요청 사이클에서 이미 자동 이동했는가 — 2차 응답 무시 = 무한 루프 차단 (D4) */
  alreadyMoved: boolean;
}): RouteAutoMove | null => {
  if (mentionedArea === null || alreadyMoved) return null;
  return {
    center: { lat: mentionedArea.centerLat, lng: mentionedArea.centerLng },
    zoom: MAP_SCALE_1KM_ZOOM,
    areaName: mentionedArea.name,
    kind: mentionedArea.kind,
  };
};

/** Figma 15675:3267의 "약 2km"는 축척 고정 결정에 따라 1km로 정정해 구현한다 (D7) */
export const MOVED_TOAST_DESCRIPTION = "지도 범위 약 1km 기준으로 동선을 짜요";

/** 이동 안내 토스트 제목 — "{지역명}(으)로 이동했어요" (D3) */
export const movedToastTitle = (areaName: string): string =>
  `${areaName}${euroJosa(areaName)} 이동했어요`;
