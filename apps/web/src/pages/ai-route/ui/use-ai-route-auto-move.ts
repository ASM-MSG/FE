import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bounds, LatLng } from "@/entities/cell";
import { useRouteRecommend } from "@/features/ai-route/api/use-route-recommend";
import { useAiRouteStore } from "@/features/ai-route/model/ai-route-store";
import type { RouteAutoMove } from "@/features/ai-route/model/route-mentioned-area";
import { VIEWPORT_TOO_WIDE_NOTICE } from "@/features/ai-route/model/route-error";
import { resolveRouteOrigin } from "@/features/ai-route/model/route-origin";
import {
  MAX_VIEWPORT_SPAN_DEG,
  VIEWPORT_SETTLE_TIMEOUT_MS,
  buildRecommendBody,
  exceedsViewportSpan,
  needsZoomNormalize,
  reachedTargetViewport,
  secondaryDelayMs,
} from "@/features/ai-route/model/route-request";
import { MAP_SCALE_1KM_ZOOM } from "@/features/map-home/model/map-scale";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import type { RouteRecommendRequestDto } from "@/shared/api/generated";
import { getCurrentPositionOrNull } from "@/shared/geolocation";
import { useMapShell } from "@/widgets/map-shell/use-map-shell";

/**
 * AI 경로추천 자동 동작 오케스트레이션 (MSG-489 L16~L25).
 * **뷰-레이어 훅** — 지도 명령(`use-map-shell`)에 직접 배선하므로 RN 재사용 대상이 아니다.
 * 판정은 전부 순수 함수(`route-origin`·`route-mentioned-area`·`route-request`)가 소유하고,
 * 여기에는 "언제 무엇을 호출하는가"와 목표 줌 단(`MAP_SCALE_1KM_ZOOM`) 주입만 남는다.
 *
 * 세 가지 자동 동작을 한 훅에 모은 이유: 셋 다 같은 재료(현위치·뷰포트 bounds·요청 시각)를
 * 공유하고 한 요청 사이클 안에서 순서로 얽혀 있다 — 나누면 재료를 이중으로 들고 있게 된다.
 *  ① 제출 시 출발지 자동 판정(D8)과 **항상 1km 축척 정규화**(D10 — §11에서 A2를 대체)
 *  ② 응답 mentionedArea → 지도 이동 + 1km 축척 고정(D2)
 *  ③ 목표 뷰포트에 도달하면 2차 자동 재요청 1회(D4·D12·Q2 안 B)
 *
 * 두 대기(정규화·2차) 모두 **반드시 종결한다** — 목표 도달 판정이 성립하지 않는 경로에서도
 * `VIEWPORT_SETTLE_TIMEOUT_MS` 뒤에는 현재 뷰포트로 보낸다. 패널이 로딩에 갇히면 안 된다 (D13).
 * 단 그 출구가 **서버 상한을 넘는 뷰포트를 쏘면 확정 400(14401)** 이라, 발사는 전부
 * `send()` 하나를 거치고 상한을 넘으면 보내는 대신 안내로 종결한다 (§12).
 * 결과 상태에서는 두 대기 플래그가 모두 꺼져 있어 뷰포트가 바뀌어도 요청이 나가지 않는다 (D14·L25).
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

/**
 * 탭 가시성 (§12) — 숨은 탭에서는 rAF가 멈춰 네이버 지도가 줌 애니메이션도 `idle`도
 * 진행하지 않는다. 그 동안 정착 대기 상한을 소모시키면 **갱신되지 않은 옛 뷰포트**로
 * 발사돼 14401을 맞는다(검증 실측: 줌 9에서 제출 후 백그라운드 전환 → 1.94° × 4.75° 요청).
 * 그래서 숨은 동안에는 상한 타이머를 걸지 않고, 복귀 시 다시 잰다.
 *
 * `document` 접근이 여기 있는 이유: 이 파일은 **뷰-레이어 훅**이다. 순수 모델
 * (`route-request` 등)은 플랫폼을 몰라야 하므로 판정만 갖고 가시성은 모른다 (RN 경계).
 */
const useDocumentVisible = (): boolean => {
  const [visible, setVisible] = useState(
    () => document.visibilityState === "visible",
  );

  useEffect(() => {
    const sync = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return visible;
};

interface AiRouteAutoMove {
  /** 제출 — 축척이 1km 단이 아니면 줌을 먼저 맞추고 새 뷰포트가 반영된 뒤 보낸다 (D10) */
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
  const zoom = useViewportStore((s) => s.zoom);
  const text = useAiRouteStore((s) => s.text);
  const normalizePending = useAiRouteStore((s) => s.normalizePending);
  const secondaryPending = useAiRouteStore((s) => s.secondaryPending);
  const requestedAt = useAiRouteStore((s) => s.requestedAt);
  const startNormalize = useAiRouteStore((s) => s.startNormalize);
  const abortPending = useAiRouteStore((s) => s.abortPending);

  const visible = useDocumentVisible();
  const coords = useCurrentCoords();
  const origin = useMemo(
    () => resolveRouteOrigin({ coords, bounds }),
    [coords, bounds],
  );

  // 이동 명령 직후의 bounds — 2차는 이 값이 **바뀐 뒤**에만 나간다.
  // moveTo·zoomTo는 명령일 뿐이고 새 bounds는 MapCanvas idle을 거쳐 스토어에 들어온다(R3).
  const boundsAtMoveRef = useRef<Bounds | null>(null);

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

  /**
   * 이 훅의 **유일한 발사 지점** — 어떤 경로(즉시·정규화 대기·2차·상한 만료)로 와도
   * 여기를 지난다. 보냈으면 true, 보내지 않았으면 false다(호출부가 종결을 책임진다).
   */
  const send = useCallback(
    (mutate: (body: RouteRecommendRequestDto) => void): boolean => {
      // 출발지는 **보내는 시점의 뷰포트**로 판정한다 — 2차는 이동 후 기준이다 (L19·A5)
      const body = buildRecommendBody({ text, bounds, origin });
      if (body === null) return false;
      // 서버 뷰포트 상한 최종 가드 (§12) — 정상 경로(1km)에서는 결코 참이 아니고,
      // 지도가 정착하지 못한 채 상한이 만료된 경로에서만 걸린다. 확정 400을 보내지 않는다.
      if (
        exceedsViewportSpan({
          viewport: body.viewport,
          maxSpanDeg: MAX_VIEWPORT_SPAN_DEG,
        })
      ) {
        return false;
      }
      mutate(body);
      return true;
    },
    [text, bounds, origin],
  );

  const submit = useCallback(() => {
    if (needsZoomNormalize({ zoom, targetZoom: MAP_SCALE_1KM_ZOOM })) {
      // 추천은 1km 단에서만 나간다 — 클릭 즉시 로딩이고 요청 시각은 mutate 때 찍는다 (D10·D11)
      startNormalize();
      zoomTo(MAP_SCALE_1KM_ZOOM);
      return;
    }
    send(sendPrimary);
  }, [zoom, zoomTo, startNormalize, send, sendPrimary]);

  useEffect(() => {
    if (!normalizePending) return;

    // 예약이 이미 소비됐으면 쏘지 않는다 — StrictMode(dev)의 이펙트 2회 실행 방어.
    // 첫 실행의 `onMutate`(startRequest)가 플래그를 끄므로 두 번째 실행은 여기서 멈춘다 (L22).
    const fire = () => {
      if (!useAiRouteStore.getState().normalizePending) return;
      // 보내지 못하면(뷰포트가 서버 상한 초과) 안내로 종결한다 — 영구 로딩도 400도 아니다 (§12)
      if (!send(sendPrimary)) abortPending(VIEWPORT_TOO_WIDE_NOTICE);
    };

    if (!needsZoomNormalize({ zoom, targetZoom: MAP_SCALE_1KM_ZOOM })) {
      fire();
      return;
    }
    // 숨은 탭에서는 지도가 정착하지 않는다 — 상한을 소모하지 않고 복귀 시 다시 잰다 (§12)
    if (!visible) return;
    // 대기 중 사용자가 줌을 되돌리면 목표에 영영 닿지 않는다 — 상한을 두고 종결한다 (D13)
    const timer = setTimeout(fire, VIEWPORT_SETTLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [normalizePending, zoom, visible, send, sendPrimary, abortPending]);

  useEffect(() => {
    if (!secondaryPending || bounds === null) return;

    // 예약 소비 여부는 스토어가 정본이다 — 위 정규화 이펙트와 같은 StrictMode 방어
    const fire = () => {
      if (!useAiRouteStore.getState().secondaryPending) return;
      if (!send(sendSecondary)) abortPending(VIEWPORT_TOO_WIDE_NOTICE);
    };

    // 옛 뷰포트로 쏘면 2차가 무의미하고(R3·L18), 진행 중 조작이 섞이면 엉뚱한 범위가 나간다 (D12)
    const reached = reachedTargetViewport({
      bounds,
      boundsAtCommand: boundsAtMoveRef.current,
      zoom,
      targetZoom: MAP_SCALE_1KM_ZOOM,
    });
    // 서버 재요청 제한(14429)은 자동 재요청도 예외가 아니다 — 남은 창만큼 로딩을 유지한다 (Q2)
    const delay = secondaryDelayMs({ requestedAt, now: Date.now() });
    if (reached && delay <= 0) {
      fire();
      return;
    }
    // 도달 대기 중 탭이 숨으면 지도가 정착하지 않는다 — 상한을 소모하지 않는다 (§12).
    // 이미 도달했으면 남은 것은 서버 10초 창뿐이라 숨은 채로도 계속 잰다.
    if (!reached && !visible) return;
    // 도달 실패 경로에서도 창 경과 후에는 현재 뷰포트로 1회 보낸다 — 영구 로딩 금지 (D13·L24)
    const timer = setTimeout(
      fire,
      reached ? delay : Math.max(delay, VIEWPORT_SETTLE_TIMEOUT_MS),
    );
    // 재제출·언마운트·뷰포트 재갱신 시 예약을 취소한다 (Q2 — 대기 중 이탈)
    return () => clearTimeout(timer);
  }, [
    secondaryPending,
    bounds,
    zoom,
    visible,
    requestedAt,
    send,
    sendSecondary,
    abortPending,
  ]);

  return { submit, originActive: origin !== null };
};
