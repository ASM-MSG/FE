import type { LatLng } from "@/entities/cell";
import { MAP_SCALE_1KM_ZOOM } from "@/features/map-home/model/map-scale";
import type { MentionedAreaDto } from "@/shared/api/generated";

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

const HANGUL_BASE = 0xac00;
const HANGUL_LAST = 0xd7a3;
/** 종성 ㄹ의 인덱스 — 받침이 ㄹ이면 "으로"가 아니라 "로"를 쓴다 */
const JONGSEONG_RIEUL = 8;

/**
 * 조사 "(으)로" 확정 — 받침 없음·ㄹ 받침은 "로", 나머지 받침은 "으로".
 * 한글 음절이 아닌 끝 글자는 받침 없음으로 본다(지역명은 한글이 정본이라 폴백 경로다).
 */
const euroJosa = (name: string): string => {
  const code = name.charCodeAt(name.length - 1);
  if (Number.isNaN(code) || code < HANGUL_BASE || code > HANGUL_LAST) {
    return "로";
  }
  const jongseong = (code - HANGUL_BASE) % 28;
  return jongseong === 0 || jongseong === JONGSEONG_RIEUL ? "로" : "으로";
};

/** 이동 안내 토스트 제목 — "{지역명}(으)로 이동했어요" (D3) */
export const movedToastTitle = (areaName: string): string =>
  `${areaName}${euroJosa(areaName)} 이동했어요`;
