import type { LatLng } from "../../../entities/cell/model/grid";
import { needsZoomNormalize } from "./route-request";

/**
 * 두 대기(축척 정규화·2차 자동 재요청)의 다음 동작 판정 (L7, MSG-559) — 모바일 고유 순수 모델.
 *
 * 웹은 같은 분기를 `use-ai-route-auto-move` 훅의 두 이펙트 안에 두고 `renderHook`으로
 * 검증하지만, 모바일 vitest에는 RN 렌더·`renderHook` 인프라가 없다(MSG-292 정책). 분기를
 * 여기 표로 내려 단위 테스트로 고정하고 훅에는 "언제 무엇을 호출하는가"만 남긴다
 * (initial-center.ts 관례). 시계·`AppState`·지도를 모른다 — 값만 받는다.
 *
 * - `fire` — 지금 요청을 보낸다(종결)
 * - `{ wait }` — 그 시간만큼 타이머를 걸고 다시 판정한다
 * - `hold` — 타이머 없이 멈춘다(앱이 백그라운드라 지도가 정착하지 않는다). 복귀하면
 *   이펙트가 다시 돌아 남은 마감으로 재판정한다 — 마감은 숨은 구간을 세지 않는다
 *   (`advanceSettleDeadline`).
 */
export type SettleAction = "fire" | "hold" | { wait: number };

/**
 * 명령한 중심이 반영됐다고 볼 위경도 오차 — SDK가 되돌려주는 부동소수 왕복분만 흡수한다
 * (1e-6° ≈ 0.1m). 이보다 크게 어긋난 중심은 다른 뷰포트다.
 */
const CENTER_MATCH_EPSILON_DEG = 1e-6;

/**
 * 정규화 카메라 명령이 화면에 반영됐는가 (L7b, MSG-559 재작업 1).
 *
 * 목표 줌만 보면 **명령과 무관한 뷰포트로 요청이 나간다**: 실기 계측(2026-09-03)에서
 * 제출 314ms 뒤 — `moveTo` 애니메이션(500ms)이 끝나기도 전에 — 명령한 중심과 다른 옛
 * 뷰포트가 목표 줌으로 들어왔고, 그 bounds로 조립된 요청은 현위치를 담지 못해 `origin`이
 * 빠졌다(S3/W9). 정착의 정본은 "내가 명령한 중심 + 목표 줌 단"이다.
 *
 * `commandedCenter`가 null이면 이 마운트에서 명령을 낸 적이 없다(재마운트) — 도달로 보지
 * 않고 정착 마감(`advanceSettleDeadline`)이 종결을 맡는다. 2차 경로의
 * `reachedTargetViewport`가 null을 도달로 보는 것과 갈리는 지점이다: 2차의 이동은 이전
 * 마운트에서 이미 끝나 있지만, 정규화는 그 사이클의 제출이 곧 명령이라 명령이 없으면
 * 기다릴 근거도 없다.
 */
export const reachedCommandedViewport = ({
  center,
  commandedCenter,
  zoom,
  targetZoom,
}: {
  /** 지금 화면의 카메라 중심 */
  center: LatLng;
  /** `moveTo`로 명령한 중심. 명령을 낸 적이 없으면 null */
  commandedCenter: LatLng | null;
  zoom: number;
  targetZoom: number;
}): boolean =>
  commandedCenter !== null &&
  !needsZoomNormalize({ zoom, targetZoom }) &&
  Math.abs(center.lat - commandedCenter.lat) <= CENTER_MATCH_EPSILON_DEG &&
  Math.abs(center.lng - commandedCenter.lng) <= CENTER_MATCH_EPSILON_DEG;

export type SettleInput =
  | {
      kind: "normalize";
      /**
       * 아직 명령한 정규화 뷰포트에 닿지 못했는가 — `!reachedCommandedViewport`.
       * 목표 줌만 보면 명령과 무관한 옛 뷰포트로 발사된다 (MSG-559 재작업 1).
       */
      needsNormalize: boolean;
      visible: boolean;
      /** 정착 마감의 남은 시간 (`advanceSettleDeadline`) */
      remainingMs: number;
    }
  | {
      kind: "secondary";
      /** 이동 명령이 반영된 목표 뷰포트인가 (`reachedTargetViewport`) */
      reached: boolean;
      visible: boolean;
      /** 서버 10초 창의 남은 시간 (`secondaryDelayMs`) */
      delayMs: number;
      remainingMs: number;
    };

export const nextSettleAction = (input: SettleInput): SettleAction => {
  if (input.kind === "normalize") {
    // 명령한 뷰포트에 닿았으면 더 기다릴 idle이 없다 — 가시성과 무관하게 즉시 발사
    if (!input.needsNormalize) return "fire";
    if (!input.visible) return "hold";
    return input.remainingMs <= 0 ? "fire" : { wait: input.remainingMs };
  }
  // 도달했으면 남은 것은 서버 10초 창뿐이라 지도와 무관하다 — 백그라운드에서도 계속 잰다
  if (input.reached) {
    return input.delayMs <= 0 ? "fire" : { wait: input.delayMs };
  }
  if (!input.visible) return "hold";
  // 도달 실패 경로: 마감이 지나도 서버 창은 지켜야 한다 — 둘 중 긴 쪽을 기다린다
  const wait = Math.max(input.delayMs, input.remainingMs);
  return wait <= 0 ? "fire" : { wait };
};
