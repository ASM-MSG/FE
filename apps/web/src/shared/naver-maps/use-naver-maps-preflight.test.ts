import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetNaverMapsPreflight } from "./naver-sdk-loader";
import { useNaverMapsPreflight } from "./use-naver-maps-preflight";

/**
 * 프리플라이트 훅 테스트 (MSG-553) — `MapCanvas`·`AreaMapCanvas`가 각자 들고 있던
 * effect 쌍(스크립트 프리플라이트 + `navermap_authFailure` 전역 훅)을 세 번째로 복제하지
 * 않기 위해 추출한 훅의 계약을 고정한다. 이식 대상이 검증된 코드라 동작이 갈리면 안 된다.
 */
const SUBMODULES = ["geocoder"];

const injectedScript = () =>
  document.querySelector<HTMLScriptElement>(
    "script[data-naver-maps-preflight]",
  );

describe("useNaverMapsPreflight — SDK 프리플라이트 상태", () => {
  beforeEach(() => {
    resetNaverMapsPreflight();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetNaverMapsPreflight();
    delete window.navermap_authFailure;
  });

  it("SDK가 이미 준비돼 있으면 ready로 수렴한다", async () => {
    vi.stubGlobal("naver", { maps: { jsContentLoaded: true } });

    const { result } = renderHook(() =>
      useNaverMapsPreflight("test-key", SUBMODULES),
    );

    await waitFor(() => expect(result.current).toBe("ready"));
  });

  it("스크립트 로드가 실패하면 failed로 수렴한다", async () => {
    vi.stubGlobal("naver", undefined);

    const { result } = renderHook(() =>
      useNaverMapsPreflight("test-key", SUBMODULES),
    );

    expect(result.current).toBe("loading");
    await waitFor(() => expect(injectedScript()).not.toBeNull());
    injectedScript()?.dispatchEvent(new Event("error"));

    await waitFor(() => expect(result.current).toBe("failed"));
  });

  it("인증 실패 전역 훅이 발화하면 준비 상태에서도 failed로 전이한다", async () => {
    vi.stubGlobal("naver", { maps: { jsContentLoaded: true } });
    const { result } = renderHook(() =>
      useNaverMapsPreflight("test-key", SUBMODULES),
    );
    await waitFor(() => expect(result.current).toBe("ready"));

    window.navermap_authFailure?.();

    await waitFor(() => expect(result.current).toBe("failed"));
  });

  it("언마운트하면 자기가 심은 전역 훅을 걷어낸다", async () => {
    vi.stubGlobal("naver", { maps: { jsContentLoaded: true } });
    const { unmount } = renderHook(() =>
      useNaverMapsPreflight("test-key", SUBMODULES),
    );
    expect(window.navermap_authFailure).toBeTypeOf("function");

    unmount();

    expect(window.navermap_authFailure).toBeUndefined();
  });
});
