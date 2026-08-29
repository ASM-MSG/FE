import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bounds, LatLng } from "@/entities/cell";
import { useRouteRecommend } from "@/features/ai-route/api/use-route-recommend";
import { useAiRouteStore } from "@/features/ai-route/model/ai-route-store";
import type { RouteAutoMove } from "@/features/ai-route/model/route-mentioned-area";
import { resolveRouteOrigin } from "@/features/ai-route/model/route-origin";
import {
  buildRecommendBody,
  needsSpanNormalize,
  secondaryDelayMs,
} from "@/features/ai-route/model/route-request";
import { MAP_SCALE_1KM_ZOOM } from "@/features/map-home/model/map-scale";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import type { RouteRecommendRequestDto } from "@/shared/api/generated";
import { getCurrentPositionOrNull } from "@/shared/geolocation";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";

/**
 * AI 경로추천 자동 동작 오케스트레이션 (MSG-489 L16~L19).
 * **뷰-레이어 훅** — 지도 명령(`use-map-shell`)에 직접 배선하므로 RN 재사용 대상이 아니다.
 * 판정은 전부 순수 함수(`route-origin`·`route-mentioned-area`·`route-request`)가 소유하고,
 * 여기에는 "언제 무엇을 호출하는가"만 남는다.
 *
 * 세 가지 자동 동작을 한 훅에 모은 이유: 셋 다 같은 재료(현위치·뷰포트 bounds·요청 시각)를
 * 공유하고 한 요청 사이클 안에서 순서로 얽혀 있다 — 나누면 재료를 이중으로 들고 있게 된다.
 *  ① 제출 시 출발지 자동 판정(D8)과 0.5도 예방 정규화(A2)
 *  ② 응답 mentionedArea → 지도 이동 + 1km 축척 고정(D2)
 *  ③ 새 뷰포트가 반영된 뒤 2차 자동 재요청 1회(D4·Q2 안 B)
 */

/** 진입 시 1회 측위 — 거부·미확보는 null 그대로 둔다(서면 폴백을 쓰면 오판정된다, A1) */
const useCurrentCoords = (): LatLng | null => {
  const [coords, setCoords] = useState<LatLng | null>(null);

  useEffect(() => {
    let active = true;
    void getCurrentPositionOrNull().then((next) => {
      if (active) setCoords(next);
    });
    return () => {
      active = false;
    };
  }, []);

  return coords;
};

interface AiRouteAutoMove {
  /** 제출 — 축척 정규화가 필요하면 줌을 먼저 맞추고 새 뷰포트가 반영된 뒤 보낸다 */
  submit: () => void;
  /** 이번 뷰포트 기준으로 출발지가 실리는가 — 입력 카드의 "현재 위치에서 출발" 표시 (S1) */
  originActive: boolean;
}

export const useAiRouteAutoMove = ({
  onLoginRequired,
}: {
  onLoginRequired: () => void;
}): AiRouteAutoMove => {
  const { moveTo, zoomTo } = useMapShell();
  const bounds = useViewportStore((s) => s.bounds);
  const text = useAiRouteStore((s) => s.text);
  const secondaryPending = useAiRouteStore((s) => s.secondaryPending);
  const requestedAt = useAiRouteStore((s) => s.requestedAt);

  const coords = useCurrentCoords();
  const origin = useMemo(
    () => resolveRouteOrigin({ coords, bounds }),
    [coords, bounds],
  );

  // 이동 명령 직후의 bounds — 2차는 이 값이 **바뀐 뒤**에만 나간다.
  // moveTo·zoomTo는 명령일 뿐이고 새 bounds는 MapCanvas idle을 거쳐 스토어에 들어온다(R3).
  const boundsAtMoveRef = useRef<Bounds | null>(null);
  // 0.5도 초과 뷰포트 정규화 대기 — 줌을 맞춘 뒤 새 bounds로 1차를 보낸다 (A2).
  // state가 아니라 ref인 이유: 대기 여부는 화면에 안 보이고, 발사 시점은 bounds 갱신이
  // 정한다. state로 두면 StrictMode(dev)의 이펙트 2회 실행에서 같은 요청이 두 번 나간다.
  const normalizingRef = useRef(false);

  const onAutoMove = useCallback(
    (move: RouteAutoMove) => {
      boundsAtMoveRef.current = useViewportStore.getState().bounds;
      moveTo(move.center);
      zoomTo(move.zoom);
    },
    [moveTo, zoomTo],
  );

  const { mutate: sendPrimary } = useRouteRecommend({
    onLoginRequired,
    onAutoMove,
  });
  const { mutate: sendSecondary } = useRouteRecommend({ secondary: true });

  const send = useCallback(
    (mutate: (body: RouteRecommendRequestDto) => void) => {
      // 출발지는 **보내는 시점의 뷰포트**로 판정한다 — 2차는 이동 후 기준이다 (L19·A5)
      const body = buildRecommendBody({ text, bounds, origin });
      if (body === null) return;
      mutate(body);
    },
    [text, bounds, origin],
  );

  const submit = useCallback(() => {
    if (needsSpanNormalize(bounds)) {
      // 서버 상한(14401) 예방 — 지역 이동이 아니므로 토스트는 띄우지 않는다 (A2)
      normalizingRef.current = true;
      zoomTo(MAP_SCALE_1KM_ZOOM);
      return;
    }
    send(sendPrimary);
  }, [bounds, zoomTo, send, sendPrimary]);

  useEffect(() => {
    if (!normalizingRef.current || needsSpanNormalize(bounds)) return;
    normalizingRef.current = false;
    send(sendPrimary);
  }, [bounds, send, sendPrimary]);

  useEffect(() => {
    if (!secondaryPending) return;
    // 옛 bounds로 쏘면 2차가 무의미하다 — 이동이 지도에 반영될 때까지 기다린다 (R3·L18)
    if (bounds === null || bounds === boundsAtMoveRef.current) return;

    // 예약이 이미 소비됐으면 쏘지 않는다 — StrictMode(dev)의 이펙트 2회 실행 방어.
    // 첫 실행의 `onMutate`가 예약을 끄므로 두 번째 실행은 여기서 멈춘다.
    const fire = () => {
      if (!useAiRouteStore.getState().secondaryPending) return;
      send(sendSecondary);
    };

    // 서버 재요청 제한(14429)은 자동 재요청도 예외가 아니다 — 남은 창만큼 로딩을 유지한다 (Q2)
    const delay = secondaryDelayMs({ requestedAt, now: Date.now() });
    if (delay <= 0) {
      fire();
      return;
    }
    const timer = setTimeout(fire, delay);
    // 재제출·언마운트·뷰포트 재갱신 시 예약을 취소한다 (Q2 — 대기 중 이탈)
    return () => clearTimeout(timer);
  }, [secondaryPending, bounds, requestedAt, send, sendSecondary]);

  return { submit, originActive: origin !== null };
};
