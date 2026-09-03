import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Keyboard } from "react-native";
import type { Bounds, LatLng } from "../../../entities/cell/model/grid";
import type { RouteRecommendRequestDto } from "../../../shared/api/sdk";
import { MAP_SCALE_1KM_ZOOM } from "../../map-home/model/map-scale";
import type { Viewport } from "../../map-home/model/viewport";
import { useRouteRecommend } from "../api/use-route-recommend";
import { aiRouteStore, useAiRouteState } from "../model/ai-route-store";
import { VIEWPORT_TOO_WIDE_NOTICE } from "../model/route-error";
import type { RouteAutoMove } from "../model/route-mentioned-area";
import { resolveRouteOrigin } from "../model/route-origin";
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
} from "../model/route-request";
import {
  nextSettleAction,
  reachedCommandedViewport,
} from "../model/settle-action";

/**
 * AI 경로추천 자동 동작 오케스트레이션 (MSG-559) — 웹 `use-ai-route-auto-move.ts`의 모바일판.
 * **뷰-레이어 훅**이다: 카메라 명령(`GridMapRef.moveTo`)·`AppState`·타이머를 다루므로 RN
 * 재사용 대상이 아니고 `model/`에 두지 않는다. 판정은 전부 순수 모듈(`route-origin`·
 * `route-mentioned-area`·`route-request`·`settle-action`)이 소유하고, 여기에는 "언제 무엇을
 * 호출하는가"와 목표 줌 단(`MAP_SCALE_1KM_ZOOM`) 주입만 남는다.
 *
 * 세 자동 동작을 한 훅에 모은 이유: 셋 다 같은 재료(현위치·뷰포트 bounds·요청 시각)를
 * 공유하고 한 요청 사이클 안에서 순서로 얽혀 있다 — 나누면 재료를 이중으로 들고 있게 된다.
 *  ① 제출 시 출발지 자동 판정과 **항상 1km 축척 정규화**
 *  ② 응답 mentionedArea → 카메라 이동 + 1km 축척 고정
 *  ③ 목표 뷰포트에 도달하면 2차 자동 재요청 1회
 *
 * 두 대기(정규화·2차) 모두 **반드시 종결한다** — 목표 도달 판정이 성립하지 않는 경로에서도
 * `VIEWPORT_SETTLE_TIMEOUT_MS` 뒤에는 현재 뷰포트로 보낸다. 시트가 로딩에 갇히면 안 된다.
 * 그 상한은 대기 사이클당 **절대 마감 한 번**이고(`advanceSettleDeadline`), 앱이 백그라운드인
 * 구간은 마감을 소모하지 않는다. 발사는 전부 `send()` 하나를 거치고 서버 뷰포트 상한을
 * 넘으면 보내는 대신 안내로 종결한다 — 영구 로딩도 확정 400도 만들지 않는다.
 * 결과 상태에서는 두 대기 플래그가 모두 꺼져 있어 뷰포트가 바뀌어도 요청이 나가지 않는다.
 *
 * **`moveTo`는 카메라 + 줌을 함께 명령한다** — `GridMapRef.moveTo`가 `initialZoom`으로
 * 정착시키고 AI 화면의 `initialZoom`이 `MAP_SCALE_1KM_ZOOM`이라, 정규화도 지역 이동도
 * 이 메서드 하나로 끝난다. 화면의 `initialZoom`을 바꾸면 정규화가 목표 줌에 닿지 않는다.
 */

/**
 * 앱 가시성 — 백그라운드에서는 지도가 카메라 애니메이션도 `onCameraIdle`도 진행하지 않고
 * JS 타이머도 지연·정지될 수 있다. 그 동안 정착 대기 상한을 소모시키면 **갱신되지 않은 옛
 * 뷰포트**로 발사돼 14401을 맞는다(웹 실측). `inactive`(iOS 앱 전환기·권한 프롬프트)도
 * 비가시로 본다. `use-app-foreground.ts`와 같은 구독이지만 그쪽은 복귀 **콜백**형이라
 * boolean이 필요한 여기서 쓸 수 없다 — 두 번째 사용처가 생기면 `shared/`로 올린다.
 */
const useAppActive = (): boolean => {
  const [active, setActive] = useState(
    () => AppState.currentState === "active",
  );

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (next) => {
      setActive(next === "active");
    });
    return () => subscription.remove();
  }, []);

  return active;
};

/**
 * 대기 사이클 1회의 정착 마감을 들고 있는다 — 판정은 `advanceSettleDeadline`이 소유하고
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
  /** 제출 — 축척이 1km 단이 아니면 줌을 먼저 맞추고 새 뷰포트가 반영된 뒤 보낸다 */
  submit: () => void;
  /** 이번 뷰포트 기준으로 출발지가 실리는가 — 입력 카드의 "현재 위치에서 출발" 행 (S1) */
  originActive: boolean;
}

export const useAiRouteAutoMove = ({
  viewport,
  mapReady,
  coords,
  moveTo,
  onLoginRequired,
}: {
  /** 화면 로컬 뷰포트 — 지도 idle마다 **새 객체**라 참조 교체가 도달 판정의 근거다 */
  viewport: Viewport | null;
  /** 제출 게이트 — bounds 확보 && 초기 중심 정착 (MSG-556 PR #124) */
  mapReady: boolean;
  /** 진입 1회 측위로 확보한 현위치 — 거부·미확보·폴백(서면)은 null (§6 A1·A3) */
  coords: LatLng | null;
  /** 카메라 명령 — `GridMapRef.moveTo`(중심 + 1km 줌 동반) */
  moveTo: (center: LatLng) => void;
  onLoginRequired: () => void;
}): AiRouteAutoMove => {
  const { normalizePending, secondaryPending, requestedAt } = useAiRouteState();
  const bounds = viewport?.bounds ?? null;
  const center = viewport?.center ?? null;
  const zoom = viewport?.zoom ?? 0;

  const visible = useAppActive();
  // 두 대기는 각자의 마감을 갖는다 — 사이클이 겹치지 않아도 상한이 서로 섞이면 안 된다
  const { remainingMs: normalizeRemainingMs, reset: resetNormalizeDeadline } =
    useSettleDeadline(visible);
  const { remainingMs: secondaryRemainingMs, reset: resetSecondaryDeadline } =
    useSettleDeadline(visible);
  const origin = useMemo(
    () => resolveRouteOrigin({ coords, bounds }),
    [coords, bounds],
  );

  /**
   * 정규화로 명령한 카메라 중심 — 1차는 지도가 **이 중심 + 1km 단**으로 정착한 뒤에만
   * 나간다. 목표 줌만 보던 종전 조건은 명령과 무관한 옛 뷰포트에도 참이 돼 그 bounds로
   * 요청을 조립했다 (실기 계측 2026-09-03: 제출 314ms 뒤 옛 뷰포트 → `origin` 누락, S3).
   */
  const commandedCenterRef = useRef<LatLng | null>(null);

  // 이동 명령 직후의 bounds — 2차는 이 값이 **바뀐 뒤**에만 나간다.
  // moveTo는 명령일 뿐이고 새 bounds는 GridMap의 onCameraIdle을 거쳐 화면 상태로 들어온다
  const boundsAtMoveRef = useRef<Bounds | null>(null);

  const onAutoMove = useCallback(
    (move: RouteAutoMove) => {
      boundsAtMoveRef.current = bounds;
      // 줌은 moveTo가 initialZoom(=1km)으로 함께 맞춘다 — 별도 줌 명령이 없다
      moveTo(move.center);
    },
    [bounds, moveTo],
  );

  const { mutate: sendPrimary } = useRouteRecommend({
    onLoginRequired,
    onAutoMove,
  });
  // 1차와 같은 인증 처리를 붙인다 — 1차 성공과 지연된 2차(서버 10초 창) 사이에 세션이
  // 만료되면 2차가 401을 받는데, 콜백이 없으면 시트만 대기로 돌아가고 로그인 화면으로
  // 가지 않는다(웹 codex 리뷰 P1 — 사용자는 왜 결과가 사라졌는지 알 수 없다)
  const { mutate: sendSecondary } = useRouteRecommend({
    secondary: true,
    onLoginRequired,
  });

  /**
   * 이 훅의 **유일한 발사 지점** — 어떤 경로(즉시·정규화 대기·2차·상한 만료)로 와도
   * 여기를 지난다. 보냈으면 true, 보내지 않았으면 false다(호출부가 종결을 책임진다).
   * 문장은 스토어에서 직접 읽는다 — 입력 타이핑마다 이 콜백이 새로 만들어져 대기 이펙트가
   * 재실행되는 것을 피한다(로딩 중에는 입력이 잠겨 있어 값도 바뀌지 않는다).
   */
  const send = useCallback(
    (mutate: (body: RouteRecommendRequestDto) => void): boolean => {
      // 출발지는 **보내는 시점의 뷰포트**로 판정한다 — 2차는 이동 후 기준이다 (W9)
      const body = buildRecommendBody({
        text: aiRouteStore.getState().text,
        bounds,
        origin,
      });
      if (body === null) return false;
      // 서버 뷰포트 상한 최종 가드 — 정상 경로(1km)에서는 결코 참이 아니고, 지도가
      // 정착하지 못한 채 상한이 만료된 경로에서만 걸린다. 확정 400을 보내지 않는다
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
    [bounds, origin],
  );

  const submit = useCallback(() => {
    if (!mapReady || viewport === null) return;
    Keyboard.dismiss();
    if (needsZoomNormalize({ zoom, targetZoom: MAP_SCALE_1KM_ZOOM })) {
      // 추천은 1km 단에서만 나간다 — 탭 즉시 로딩이고 요청 시각은 실제 mutate 때 찍는다
      aiRouteStore.startNormalize();
      commandedCenterRef.current = viewport.center;
      moveTo(viewport.center);
      return;
    }
    send(sendPrimary);
  }, [mapReady, viewport, zoom, moveTo, send, sendPrimary]);

  useEffect(() => {
    if (!normalizePending) {
      resetNormalizeDeadline();
      return;
    }

    // 예약이 이미 소비됐으면 쏘지 않는다 — 이펙트 2회 실행(StrictMode) 방어.
    // 첫 실행의 `onMutate`(startRequest)가 플래그를 끄므로 두 번째 실행은 여기서 멈춘다
    const fire = () => {
      if (!aiRouteStore.getState().normalizePending) return;
      // 보내지 못하면(뷰포트가 서버 상한 초과) 안내로 종결한다 — 영구 로딩도 400도 아니다
      if (!send(sendPrimary))
        aiRouteStore.abortPending(VIEWPORT_TOO_WIDE_NOTICE);
    };

    // 명령한 중심 + 목표 줌으로 정착했는가 — 줌만 보면 옛 뷰포트로 나간다 (재작업 1)
    const needsNormalize = !(
      center !== null &&
      reachedCommandedViewport({
        center,
        commandedCenter: commandedCenterRef.current,
        zoom,
        targetZoom: MAP_SCALE_1KM_ZOOM,
      })
    );
    // 마감 소모(숨김 구간 기록 포함)는 대기 중일 때만 일으킨다
    const remaining = needsNormalize ? normalizeRemainingMs(Date.now()) : 0;
    const action = nextSettleAction({
      kind: "normalize",
      needsNormalize,
      visible,
      remainingMs: remaining,
    });
    if (action === "hold") return;
    if (action === "fire") {
      fire();
      return;
    }
    const timer = setTimeout(fire, action.wait);
    return () => clearTimeout(timer);
  }, [
    normalizePending,
    center,
    zoom,
    visible,
    send,
    sendPrimary,
    normalizeRemainingMs,
    resetNormalizeDeadline,
  ]);

  useEffect(() => {
    if (!secondaryPending) {
      resetSecondaryDeadline();
      return;
    }
    if (bounds === null) return;

    // 예약 소비 여부는 스토어가 정본이다 — 위 정규화 이펙트와 같은 이중 실행 방어
    const fire = () => {
      if (!aiRouteStore.getState().secondaryPending) return;
      if (!send(sendSecondary)) {
        aiRouteStore.abortPending(VIEWPORT_TOO_WIDE_NOTICE);
      }
    };

    // 옛 뷰포트로 쏘면 2차가 무의미하고, 진행 중 조작이 섞이면 엉뚱한 범위가 나간다
    const reached = reachedTargetViewport({
      bounds,
      boundsAtCommand: boundsAtMoveRef.current,
      zoom,
      targetZoom: MAP_SCALE_1KM_ZOOM,
    });
    // 서버 재요청 제한(14429)은 자동 재요청도 예외가 아니다 — 남은 창만큼 로딩을 유지한다
    const delayMs = secondaryDelayMs({ requestedAt, now: Date.now() });
    const remaining = reached ? 0 : secondaryRemainingMs(Date.now());
    const action = nextSettleAction({
      kind: "secondary",
      reached,
      visible,
      delayMs,
      remainingMs: remaining,
    });
    if (action === "hold") return;
    if (action === "fire") {
      fire();
      return;
    }
    // 재제출·언마운트·뷰포트 재갱신 시 예약을 취소한다 (대기 중 이탈)
    const timer = setTimeout(fire, action.wait);
    return () => clearTimeout(timer);
  }, [
    secondaryPending,
    bounds,
    zoom,
    visible,
    requestedAt,
    send,
    sendSecondary,
    secondaryRemainingMs,
    resetSecondaryDeadline,
  ]);

  return { submit, originActive: origin !== null };
};
