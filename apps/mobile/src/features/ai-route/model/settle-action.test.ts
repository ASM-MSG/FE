import { describe, expect, it } from "vitest";
import { nextSettleAction, reachedCommandedViewport } from "./settle-action";

/**
 * 템플릿 ① 순수 로직 — 두 대기(정규화·2차)의 다음 동작 판정 (L7, MSG-559).
 *
 * 모바일 고유 모듈이다: 웹은 같은 분기를 훅 이펙트 안에 두고 `renderHook`으로 검증하지만
 * 모바일 vitest에는 RN 렌더·`renderHook` 인프라가 없다(MSG-292 정책). 그래서 "언제 쏘고
 * 언제 기다리고 언제 멈추는가"를 순수 표로 내려 여기서 고정하고, 훅에는 호출만 남긴다
 * (initial-center.ts 관례).
 */
describe("nextSettleAction — 정규화 대기 (L7)", () => {
  it("이미 1km 단이면 가시성·마감과 무관하게 즉시 발사한다", () => {
    expect(
      nextSettleAction({
        kind: "normalize",
        needsNormalize: false,
        visible: false,
        remainingMs: 0,
      }),
    ).toBe("fire");
  });

  it("정규화가 필요한데 앱이 백그라운드면 타이머 없이 멈춘다 — 마감을 세지 않는다", () => {
    expect(
      nextSettleAction({
        kind: "normalize",
        needsNormalize: true,
        visible: false,
        remainingMs: 1_200,
      }),
    ).toBe("hold");
  });

  it("정규화 대기 중 마감이 만료되면 현재 뷰포트로 종결 발사한다", () => {
    expect(
      nextSettleAction({
        kind: "normalize",
        needsNormalize: true,
        visible: true,
        remainingMs: 0,
      }),
    ).toBe("fire");
  });

  it("정규화 대기 중 마감이 남아 있으면 남은 시간만 기다린다", () => {
    expect(
      nextSettleAction({
        kind: "normalize",
        needsNormalize: true,
        visible: true,
        remainingMs: 1_200,
      }),
    ).toEqual({ wait: 1_200 });
  });
});

describe("nextSettleAction — 2차 자동 재요청 대기 (L7)", () => {
  it("목표 뷰포트에 도달했고 서버 10초 창이 지났으면 즉시 발사한다", () => {
    expect(
      nextSettleAction({
        kind: "secondary",
        reached: true,
        visible: true,
        delayMs: 0,
        remainingMs: 0,
      }),
    ).toBe("fire");
  });

  it("도달했으면 남은 것은 서버 10초 창뿐이라 백그라운드에서도 계속 기다린다 (가시성 무관)", () => {
    expect(
      nextSettleAction({
        kind: "secondary",
        reached: true,
        visible: false,
        delayMs: 4_000,
        remainingMs: 0,
      }),
    ).toEqual({ wait: 4_000 });
  });

  it("도달 전 앱이 백그라운드면 타이머 없이 멈춘다 — 옛 뷰포트로 쏘지 않는다", () => {
    expect(
      nextSettleAction({
        kind: "secondary",
        reached: false,
        visible: false,
        delayMs: 4_000,
        remainingMs: 1_200,
      }),
    ).toBe("hold");
  });

  it("도달 전 대기는 서버 창과 정착 마감 중 **긴 쪽**을 기다린다 — 창을 먼저 넘기지 않는다", () => {
    expect(
      nextSettleAction({
        kind: "secondary",
        reached: false,
        visible: true,
        delayMs: 4_000,
        remainingMs: 1_200,
      }),
    ).toEqual({ wait: 4_000 });
  });

  it("도달 실패 경로도 창·마감이 모두 소진되면 현재 뷰포트로 1회 종결한다 — 영구 로딩 금지", () => {
    expect(
      nextSettleAction({
        kind: "secondary",
        reached: false,
        visible: true,
        delayMs: 0,
        remainingMs: 0,
      }),
    ).toBe("fire");
  });
});

/**
 * 템플릿 ① 순수 로직 — 정규화 카메라 명령의 반영 판정 (L7b, MSG-559 재작업 1).
 *
 * 실기 계측(2026-09-03, emulator-5554)에서 제출 314ms 뒤 — `moveTo` 애니메이션(500ms)이
 * 끝나기도 전에 — 명령한 중심과 **다른 옛 뷰포트**가 zoom 13으로 들어왔고, 줌만 보던
 * 발사 조건이 그 뷰포트로 요청을 조립해 `origin`이 빠졌다(S3/W9). 목표 줌만으로는
 * "내가 명령한 카메라가 반영됐다"를 증명하지 못한다 — 중심까지 대조한다.
 */
describe("reachedCommandedViewport — 정규화 명령 반영 판정 (L7b)", () => {
  const CENTER = { lat: 35.1883338013382, lng: 129.0594 };

  it("명령한 중심에 목표 줌으로 정착했으면 도달이다", () => {
    expect(
      reachedCommandedViewport({
        center: CENTER,
        commandedCenter: CENTER,
        zoom: 13,
        targetZoom: 13,
      }),
    ).toBe(true);
  });

  it("줌은 목표 단인데 중심이 명령과 다르면 도달이 아니다 — 옛 뷰포트로 쏘지 않는다 (S3 재현)", () => {
    expect(
      reachedCommandedViewport({
        center: { lat: 35.1578, lng: 129.0594 },
        commandedCenter: CENTER,
        zoom: 13,
        targetZoom: 13,
      }),
    ).toBe(false);
  });

  it("중심은 맞는데 아직 목표 줌이 아니면 도달이 아니다 — 애니메이션 중이다", () => {
    expect(
      reachedCommandedViewport({
        center: CENTER,
        commandedCenter: CENTER,
        zoom: 15,
        targetZoom: 13,
      }),
    ).toBe(false);
  });

  it("줌은 내림 비교라 목표 단 안의 소수 줌은 도달이다 (needsZoomNormalize와 같은 기준)", () => {
    expect(
      reachedCommandedViewport({
        center: CENTER,
        commandedCenter: CENTER,
        zoom: 13.4,
        targetZoom: 13,
      }),
    ).toBe(true);
  });

  it("부동소수 왕복 오차(1e-9°)는 같은 중심으로 본다 — SDK가 되돌려주는 값이다", () => {
    expect(
      reachedCommandedViewport({
        center: { lat: CENTER.lat + 1e-9, lng: CENTER.lng - 1e-9 },
        commandedCenter: CENTER,
        zoom: 13,
        targetZoom: 13,
      }),
    ).toBe(true);
  });

  it("명령을 낸 적이 없으면(재마운트) 도달이 아니다 — 종결은 정착 마감이 맡는다", () => {
    expect(
      reachedCommandedViewport({
        center: CENTER,
        commandedCenter: null,
        zoom: 13,
        targetZoom: 13,
      }),
    ).toBe(false);
  });
});
