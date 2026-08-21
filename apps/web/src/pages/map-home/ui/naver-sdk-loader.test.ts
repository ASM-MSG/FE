/**
 * 네이버 SDK 프리플라이트 로더 테스트 (MSG-254 재작업 2).
 *
 * react-naver-maps 0.2.2의 useNavermaps promise 캐시는 실패한 promise를 퇴거하지 않아
 * "다시 시도"가 실제 네트워크 재시도를 못 한다. 경계가 SDK 마운트 전에 스크립트를 직접
 * 로드하고, 실패 시 잔재를 비운 뒤 재주입해 진짜 재시도가 되는 계약을 단정한다.
 *
 * 인증 실패 시 SDK의 전역 잔존 상태는 브라우저 관찰로 확정했다: naver.maps가 내부만
 * 깨진 채 남고 jsContentLoaded까지 true가 될 수 있다 — 존재·jsContentLoaded 어느 것도
 * 오염 판별에 충분치 않아, 유일하게 신뢰 가능한 신호인 navermap_authFailure를 받은
 * 쪽(MapCanvas)이 markNaverMapsPoisoned로 로더에 알리는 계약이다.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildNaverMapsScriptUrl,
  JS_CONTENT_LOADED_TIMEOUT_MS,
  loadNaverMapsScript,
  markNaverMapsPoisoned,
  resetNaverMapsPreflight,
} from "./naver-sdk-loader";

const SCRIPT_SELECTOR = "script[data-naver-maps-preflight]";

const injectedScripts = () => [
  ...document.querySelectorAll<HTMLScriptElement>(SCRIPT_SELECTOR),
];

/** 테스트용 naver.maps 대역 — jsContentLoaded 준비 상태와 SDK 콜백 슬롯을 흉내낸다 */
interface FakeMaps {
  jsContentLoaded: boolean;
  onJSContentLoaded?: () => void;
}

/** 테스트용 naver 전역 — maps가 준비된/깨진/없는(null) 상태를 흉내낸다 */
const stubNaverGlobal = (maps: FakeMaps | null) => {
  vi.stubGlobal("naver", { maps });
};

const naverGlobalValue = () => (globalThis as { naver?: unknown }).naver;

/** promise가 아직 settle되지 않았음을 마이크로태스크 flush 후 단정하기 위한 플래그 */
const settledFlag = (promise: Promise<unknown>) => {
  const flag = { settled: false };
  promise.then(
    () => {
      flag.settled = true;
    },
    () => {
      flag.settled = true;
    },
  );
  return flag;
};

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("buildNaverMapsScriptUrl — 프리플라이트 URL 조립", () => {
  it("ncpKeyId와 submodules로 네이버 공식 로더 URL을 만든다", () => {
    expect(buildNaverMapsScriptUrl("test-key", ["geocoder"])).toBe(
      "https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=test-key&submodules=geocoder",
    );
  });

  it("submodules 구분자 ','를 percent-encode하지 않는다 — 네이버 로더는 raw ','로 split한다", () => {
    const url = buildNaverMapsScriptUrl("test-key", ["geocoder", "drawing"]);
    expect(url).toContain("submodules=geocoder,drawing");
    expect(url).not.toContain("%2C");
  });
});

describe("loadNaverMapsScript — 스크립트 주입·오염 판별·재시도", () => {
  afterEach(() => {
    // 로더 모듈 상태(pending·오염 마크·주입 태그)를 다음 케이스와 격리한다
    resetNaverMapsPreflight();
    vi.unstubAllGlobals();
  });

  const URL = "https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=t";

  it("SDK가 준비 상태(naver.maps + jsContentLoaded)면 스크립트 주입 없이 resolve한다", async () => {
    stubNaverGlobal({ jsContentLoaded: true });
    await expect(loadNaverMapsScript(URL)).resolves.toBeUndefined();
    expect(injectedScripts()).toHaveLength(0);
  });

  it("태그를 주입하고, load 후 스크립트가 만든 네임스페이스의 jsContentLoaded 발화까지 대기하며 기존 핸들러를 보존 호출한다", async () => {
    const promise = loadNaverMapsScript(URL);
    const flag = settledFlag(promise);
    const [tag] = injectedScripts();
    expect(tag.src).toBe(URL);
    expect(tag.async).toBe(true);

    // 스크립트 실행 재현: 네임스페이스 생성 → load 이벤트 → (인증·서브모듈 후) 발화
    const prevHandler = vi.fn();
    const maps: FakeMaps = {
      jsContentLoaded: false,
      onJSContentLoaded: prevHandler,
    };
    stubNaverGlobal(maps);
    tag.dispatchEvent(new Event("load"));
    await flushMicrotasks();
    expect(flag.settled).toBe(false);

    maps.jsContentLoaded = true;
    maps.onJSContentLoaded?.();
    await expect(promise).resolves.toBeUndefined();
    expect(prevHandler).toHaveBeenCalledTimes(1);
    // 성공한 태그는 유지된다 — SDK 전역의 원천
    expect(injectedScripts()).toHaveLength(1);
  });

  it("load 후에도 naver.maps가 없으면 reject하고 태그를 제거한다", async () => {
    const promise = loadNaverMapsScript(URL);
    const [tag] = injectedScripts();
    tag.dispatchEvent(new Event("load"));
    await expect(promise).rejects.toThrow();
    expect(injectedScripts()).toHaveLength(0);
  });

  it("전역이 있어도 jsContentLoaded 전(stale 잔존)이면 그 네임스페이스를 무효화하고 재주입한다", async () => {
    stubNaverGlobal({ jsContentLoaded: false });

    const promise = loadNaverMapsScript(URL);
    expect(injectedScripts()).toHaveLength(1);
    // stale 네임스페이스에 기대지 않는다 — 재실행된 스크립트가 새로 만든 것만 신뢰
    expect(naverGlobalValue()).toBeUndefined();

    const freshMaps: FakeMaps = { jsContentLoaded: true };
    stubNaverGlobal(freshMaps);
    injectedScripts()[0].dispatchEvent(new Event("load"));
    await expect(promise).resolves.toBeUndefined();
  });

  it("인증 실패가 보고되면(markNaverMapsPoisoned) jsContentLoaded=true 전역도 신뢰하지 않고 재주입한다", async () => {
    // 브라우저 관찰: 인증 실패에도 SDK는 서브모듈을 마저 로드해 jsContentLoaded=true로 남긴다.
    // 이 상태를 준비됨으로 오판하면 재시도가 재주입 없이 깨진 네임스페이스로 재실패한다
    stubNaverGlobal({ jsContentLoaded: true });
    markNaverMapsPoisoned();

    const promise = loadNaverMapsScript(URL);
    expect(injectedScripts()).toHaveLength(1);
    expect(naverGlobalValue()).toBeUndefined();

    const freshMaps: FakeMaps = { jsContentLoaded: true };
    stubNaverGlobal(freshMaps);
    injectedScripts()[0].dispatchEvent(new Event("load"));
    await expect(promise).resolves.toBeUndefined();

    // 재주입으로 새 판정이 섰으므로 오염 마크는 해제 — 준비 상태 short-circuit 복귀
    await expect(loadNaverMapsScript(URL)).resolves.toBeUndefined();
    expect(injectedScripts()).toHaveLength(1);
  });

  it("네트워크 실패(error) 시 reject + 태그 제거 후, 재호출이 새 태그를 주입한다 — 진짜 재시도", async () => {
    const first = loadNaverMapsScript(URL);
    const [firstTag] = injectedScripts();
    firstTag.dispatchEvent(new Event("error"));
    await expect(first).rejects.toThrow();
    expect(injectedScripts()).toHaveLength(0);

    const retry = loadNaverMapsScript(URL);
    const [retryTag] = injectedScripts();
    expect(retryTag).toBeDefined();
    expect(retryTag).not.toBe(firstTag);

    stubNaverGlobal({ jsContentLoaded: true });
    retryTag.dispatchEvent(new Event("load"));
    await expect(retry).resolves.toBeUndefined();
  });

  it("로드 진행 중 재호출은 같은 promise를 반환하고 태그를 중복 주입하지 않는다", async () => {
    const first = loadNaverMapsScript(URL);
    const second = loadNaverMapsScript(URL);
    expect(second).toBe(first);
    expect(injectedScripts()).toHaveLength(1);

    stubNaverGlobal({ jsContentLoaded: true });
    injectedScripts()[0].dispatchEvent(new Event("load"));
    await expect(first).resolves.toBeUndefined();
  });

  it("인증 실패로 영구 대기 중이어도 reset 후 재호출하면 stale 태그를 제거하고 재주입한다 — 진짜 네트워크 재시도", async () => {
    // 인증 실패의 한 형태: load는 끝났지만 jsContentLoaded가 영원히 안 와 pending에 갇힌다
    // (실패 신호 자체는 window.navermap_authFailure 전역 훅 담당 — MapCanvas)
    const stuck = loadNaverMapsScript(URL);
    const flag = settledFlag(stuck);
    const [staleTag] = injectedScripts();
    stubNaverGlobal({ jsContentLoaded: false });
    staleTag.dispatchEvent(new Event("load"));
    await flushMicrotasks();
    expect(flag.settled).toBe(false);

    // "다시 시도": reset이 갇힌 pending과 stale 태그를 비워 재주입 경로를 연다
    resetNaverMapsPreflight();
    expect(injectedScripts()).toHaveLength(0);

    const retry = loadNaverMapsScript(URL);
    expect(retry).not.toBe(stuck);
    const tags = injectedScripts();
    expect(tags).toHaveLength(1);
    expect(tags[0]).not.toBe(staleTag);

    const freshMaps: FakeMaps = { jsContentLoaded: false };
    stubNaverGlobal(freshMaps);
    tags[0].dispatchEvent(new Event("load"));
    freshMaps.jsContentLoaded = true;
    freshMaps.onJSContentLoaded?.();
    await expect(retry).resolves.toBeUndefined();
  });
});

describe("loadNaverMapsScript — jsContentLoaded 타임아웃 (PR #25 리뷰 반영)", () => {
  // 결함 재현 대상: load는 왔지만 jsContentLoaded도 navermap_authFailure도 영원히 안 오면
  // promise가 영구 pending → MapCanvas sdkStatus가 "loading"에 갇혀 재시도 없는 무한
  // aria-busy(조용한 실패)가 된다. 타임아웃 reject로 기존 실패 경로(MapFallback)로 수렴해야 한다.
  afterEach(() => {
    resetNaverMapsPreflight();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  const URL = "https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=t";

  it("load 후 jsContentLoaded가 타임아웃까지 오지 않으면 reject한다 — 무한 로딩(조용한 실패) 방지", async () => {
    vi.useFakeTimers();
    const promise = loadNaverMapsScript(URL);
    const [tag] = injectedScripts();
    stubNaverGlobal({ jsContentLoaded: false });
    tag.dispatchEvent(new Event("load"));

    // 거부 단정을 타이머 진행 전에 부착한다 — 타임아웃 발화 순간 미처리 거부가 되지 않게
    const rejection = expect(promise).rejects.toThrow(/jsContentLoaded/);
    await vi.advanceTimersByTimeAsync(JS_CONTENT_LOADED_TIMEOUT_MS);
    await rejection;

    // 타임아웃 후 재시도 정합: reset이 잔존 태그를 비우고, 재호출이 새 태그를 주입한다
    resetNaverMapsPreflight();
    expect(injectedScripts()).toHaveLength(0);
    const retry = loadNaverMapsScript(URL);
    expect(retry).not.toBe(promise);
    expect(injectedScripts()).toHaveLength(1);
  });

  it("타임아웃 전에 jsContentLoaded가 발화하면 resolve하고 타이머를 정리한다 — 타이머 누수 없음", async () => {
    vi.useFakeTimers();
    const promise = loadNaverMapsScript(URL);
    const [tag] = injectedScripts();
    const maps: FakeMaps = { jsContentLoaded: false };
    stubNaverGlobal(maps);
    tag.dispatchEvent(new Event("load"));

    maps.jsContentLoaded = true;
    maps.onJSContentLoaded?.();
    await expect(promise).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("버려진 시도의 스테일 onJSContentLoaded가 늦게 발화해도 새 시도의 타임아웃을 소실시키지 않는다 — 공유 타이머 슬롯 레이스 회귀 방지", async () => {
    vi.useFakeTimers();
    // attempt 0: load까지 진행 — 구 maps 객체에 핸들러·타이머가 부착된다
    const abandoned = loadNaverMapsScript(URL);
    settledFlag(abandoned); // 호출부(MapCanvas)의 .catch·cancelled 가드에 해당 — 미처리 거부 방지
    const staleMaps: FakeMaps = { jsContentLoaded: false };
    stubNaverGlobal(staleMaps);
    injectedScripts()[0].dispatchEvent(new Event("load"));

    // 폴백 → 재시도: reset 후 attempt 1이 새 스크립트를 로드하고 자기 타이머를 설정한다
    resetNaverMapsPreflight();
    const retry = loadNaverMapsScript(URL);
    const retryFlag = settledFlag(retry);
    const freshMaps: FakeMaps = { jsContentLoaded: false };
    stubNaverGlobal(freshMaps);
    injectedScripts()[0].dispatchEvent(new Event("load"));

    // 레이스: 구 maps 객체의 스테일 핸들러가 새 시도의 타이머 설정 이후에 발화한다.
    // 공유 슬롯 구현에서는 이 발화가 새 시도의 타이머를 지워 타임아웃이 소실된다
    staleMaps.jsContentLoaded = true;
    staleMaps.onJSContentLoaded?.();

    // 새 시도의 jsContentLoaded가 영영 안 와도 타임아웃이 살아 있어 reject해야 한다
    const rejection = expect(retry).rejects.toThrow(/jsContentLoaded/);
    await vi.advanceTimersByTimeAsync(JS_CONTENT_LOADED_TIMEOUT_MS);
    expect(retryFlag.settled).toBe(true);
    await rejection;
  });

  it("reset으로 버려진 시도의 유령 타이머가 늦게 발화해도 자기(버려진) promise만 reject하고 새 시도는 영향 없다", async () => {
    vi.useFakeTimers();
    // attempt 0: load까지 진행 후 버려진다 — 타이머는 클로저 로컬이라 reset이 지우지 않는다(유령 타이머)
    const abandoned = loadNaverMapsScript(URL);
    const abandonedFlag = settledFlag(abandoned); // 호출부의 .catch·cancelled 가드에 해당 — 미처리 거부 없이 소멸
    stubNaverGlobal({ jsContentLoaded: false });
    injectedScripts()[0].dispatchEvent(new Event("load"));

    // 두 시도의 타이머 만료 시점을 벌린 뒤 재시도
    await vi.advanceTimersByTimeAsync(1_000);
    resetNaverMapsPreflight();
    const retry = loadNaverMapsScript(URL);
    const retryFlag = settledFlag(retry);
    const freshMaps: FakeMaps = { jsContentLoaded: false };
    stubNaverGlobal(freshMaps);
    injectedScripts()[0].dispatchEvent(new Event("load"));

    // 유령 타이머(버려진 시도)가 먼저 발화 — 버려진 promise만 reject, 새 시도는 계속 대기
    await vi.advanceTimersByTimeAsync(JS_CONTENT_LOADED_TIMEOUT_MS - 1_000);
    expect(abandonedFlag.settled).toBe(true);
    expect(retryFlag.settled).toBe(false);

    // 새 시도의 핸들러·타이머 정리는 정상 동작 — 유령 발화의 영향 없이 resolve
    freshMaps.jsContentLoaded = true;
    freshMaps.onJSContentLoaded?.();
    await expect(retry).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
});
