import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bounds, LatLng } from "@/entities/cell";
import { useRouteRecommend } from "@/features/ai-route/api/use-route-recommend";
import { useAiRouteStore } from "@/features/ai-route/model/ai-route-store";
import type { RouteAutoMove } from "@/features/ai-route/model/route-mentioned-area";
import { VIEWPORT_TOO_WIDE_NOTICE } from "@/features/ai-route/model/route-error";
import { resolveRouteOrigin } from "@/features/ai-route/model/route-origin";
import {
  MAX_VIEWPORT_SPAN_DEG,
  type SettleDeadline,
  VIEWPORT_SETTLE_TIMEOUT_MS,
  advanceSettleDeadline,
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
 * 그 상한은 **대기 사이클당 절대 마감 한 번**이다(`advanceSettleDeadline`) — 이펙트가
 * 뷰포트 갱신마다 재실행돼도 남은 시간만 다시 잴 뿐이라, 사용자가 계속 패닝해도 종결이
 * 밀리지 않는다. 단 마감은 가시 구간만 소모한다 (§13·§12).
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

/**
 * 대기 사이클 1회의 정착 마감을 들고 있는다 (§13) — 판정은 `advanceSettleDeadline`이 소유하고
 * 여기에는 ref 보관과 시계(`Date.now`) 주입만 남는다.
 *
 * `remainingMs`는 이펙트가 재실행될 때마다 호출된다: 첫 호출이 마감을 정하고 이후에는 남은
 * 시간만 돌려주므로, 뷰포트가 아무리 자주 갱신돼도 종결이 밀리지 않는다. 대기가 끝나면
 * (예약 플래그가 내려가면) `reset()`으로 다음 사이클에 새 상한을 준다.
 */
const useSettleDeadline = (visible: boolean) => {
  const deadlineRef = useRef<SettleDeadline | null>(null);

  const remainingMs = useCallback(
    (now: number): number => {
      const advanced = advanceSettleDeadline({
        deadline: deadlineRef.current,
        now,
        visible,
        timeoutMs: VIEWPORT_SETTLE_TIMEOUT_MS,
      });
      deadlineRef.current = advanced.deadline;
      return advanced.remainingMs;
    },
    [visible],
  );

  const reset = useCallback(() => {
    deadlineRef.current = null;
  }, []);

  return { remainingMs, reset };
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
  // 두 대기는 각자의 마감을 갖는다 — 사이클이 겹치지 않아도 상한이 서로 섞이면 안 된다
  const { remainingMs: normalizeRemainingMs, reset: resetNormalizeDeadline } =
    useSettleDeadline(visible);
  const { remainingMs: secondaryRemainingMs, reset: resetSecondaryDeadline } =
    useSettleDeadline(visible);
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
  // 1차와 같은 인증 처리를 붙인다 — 1차 성공과 지연된 2차(서버 10초 창) 사이에 세션이
  // 만료되면 2차가 401을 받는데, 콜백이 없으면 패널만 입력 대기로 돌아가고 로그인 모달이
  // 뜨지 않는다(codex 리뷰 P1 — 사용자는 왜 결과가 사라졌는지 알 수 없다).
  const { mutate: sendSecondary } = useRouteRecommend({
    secondary: true,
    onLoginRequired,
  });

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
    if (!normalizePending) {
      resetNormalizeDeadline();
      return;
    }

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
    // 대기 중 사용자가 줌을 되돌리면 목표에 영영 닿지 않는다 — 상한을 두고 종결한다 (D13).
    // 마감은 이 사이클에서 한 번만 서고, 재실행은 **남은 시간만** 다시 잰다 (§13).
    const remaining = normalizeRemainingMs(Date.now());
    // 숨은 탭에서는 지도가 정착하지 않는다 — 그 구간은 마감에서 빠진다 (§12)
    if (!visible) return;
    if (remaining <= 0) {
      fire();
      return;
    }
    const timer = setTimeout(fire, remaining);
    return () => clearTimeout(timer);
  }, [
    normalizePending,
    zoom,
    visible,
    send,
    sendPrimary,
    abortPending,
    normalizeRemainingMs,
    resetNormalizeDeadline,
  ]);

  useEffect(() => {
    if (!secondaryPending) {
      resetSecondaryDeadline();
      return;
    }
    if (bounds === null) return;

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
    // 이미 도달했으면 남은 것은 서버 10초 창뿐이다 — 지도와 무관하므로 숨은 채로도 계속 잰다 (§12)
    if (reached) {
      if (delay <= 0) {
        fire();
        return;
      }
      const windowTimer = setTimeout(fire, delay);
      return () => clearTimeout(windowTimer);
    }
    // 도달 실패 경로에서도 마감이 지나면 현재 뷰포트로 1회 보낸다 — 영구 로딩 금지 (D13·L24).
    // 마감은 이 사이클에서 한 번만 서고 재실행은 남은 시간만 잰다 — 갱신마다 다시 재면
    // 사용자가 계속 지도를 만지는 동안 2차가 무한히 연기된다 (§13).
    const remaining = secondaryRemainingMs(Date.now());
    // 도달 대기 중 탭이 숨으면 지도가 정착하지 않는다 — 그 구간은 마감에서 빠진다 (§12)
    if (!visible) return;
    const wait = Math.max(delay, remaining);
    if (wait <= 0) {
      fire();
      return;
    }
    const timer = setTimeout(fire, wait);
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
    secondaryRemainingMs,
    resetSecondaryDeadline,
  ]);

  return { submit, originActive: origin !== null };
};
