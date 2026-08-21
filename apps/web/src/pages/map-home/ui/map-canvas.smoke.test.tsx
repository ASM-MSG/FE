/**
 * MapCanvas 스모크 (MSG-254 재작업) — naver 전역 mock으로 SDK 하위 트리를 실마운트한다.
 *
 * 재작업 1회차-1(AC 8): 인증 실패 시 네이버 SDK는 naver.maps를 null로 만들고, 이때 SDK 하위
 * 트리 언마운트의 라이브러리 cleanup(naver.maps.Event.removeListener)이 throw한다.
 * 에러 경계가 마운트를 유지한 채 children만 폴백으로 교체해 이 예외를 흡수하고
 * 앱이 죽지 않아야 한다 — 검증 리포트의 크래시 재현 경로를 jsdom으로 번역한 것.
 *
 * 재작업 1회차-3: SDK 내장 축척 컨트롤(scaleControl)이 커스텀 축척 바(MSG-123)와 중복 표시되지
 * 않도록 비활성되어 Map 생성 옵션에 반영되는지 단정한다. 다른 컨트롤 기본값은 건드리지 않는다.
 *
 * 재작업 2회차(AC 8): 인증 실패 후 재시도에서 라이브러리 훅의 모듈 레벨 promise 캐시가
 * 최초 마운트 시점의(오염된) naver.maps로 resolve된 promise를 같은 캐시 키로 돌려줘,
 * 프리플라이트가 전역을 재구축해도 지도가 이전 객체로 생성되는 결함의 재현 — 재시도
 * 리마운트의 지도 생성은 재구축된 새 네임스페이스를 통해 일어나야 한다.
 */
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { MapCanvas as MapCanvasType } from "./MapCanvas";
import { resetNaverMapsPreflight } from "./naver-sdk-loader";

/** 라이브러리(NaverMap)가 생성하는 지도 인스턴스의 최소 대역 */
class FakeMap {
  static instances: FakeMap[] = [];
  options: Record<string, unknown>;
  constructor(_el: HTMLElement, options: Record<string, unknown>) {
    this.options = options;
    FakeMap.instances.push(this);
  }
  destroy() {}
  panTo() {}
  get(key: string) {
    return this.options[key];
  }
}

const fakeEvent = {
  addListener: () => ({}),
  removeListener: () => {},
  clearInstanceListeners: () => {},
};

/** naver.maps 대역 — jsContentLoaded=true라 라이브러리 로더가 즉시 resolve한다 */
const fakeMaps = { jsContentLoaded: true, Map: FakeMap, Event: fakeEvent };

/**
 * 재시도 시 스크립트 재실행이 구축하는 "새 네임스페이스" 대역 — instances 기록이 FakeMap과
 * 분리된 별도 클래스라, 지도 생성이 이전(오염) 네임스페이스와 새 네임스페이스 중
 * 어느 쪽을 탔는지 판별한다
 */
class FreshFakeMap {
  static instances: FreshFakeMap[] = [];
  options: Record<string, unknown>;
  constructor(_el: HTMLElement, options: Record<string, unknown>) {
    this.options = options;
    FreshFakeMap.instances.push(this);
  }
  destroy() {}
  panTo() {}
  get(key: string) {
    return this.options[key];
  }
}

/** 전역 naver 컨테이너 — 인증 실패 시 SDK처럼 maps를 null로 바꿀 수 있게 참조를 유지 */
let naverGlobal: { maps: typeof fakeMaps | null };

let MapCanvas: typeof MapCanvasType;

beforeAll(async () => {
  // MapCanvas는 모듈 스코프에서 키를 읽으므로 첫 import 전에 주입한다
  vi.stubEnv("VITE_NAVER_MAP_NCP_KEY_ID", "smoke-test-key");
  ({ MapCanvas } = await import("./MapCanvas"));
});

beforeEach(() => {
  // 이전 케이스가 남긴 로더 상태(인증 실패 오염 마크 등)를 케이스 간 격리한다
  resetNaverMapsPreflight();
  naverGlobal = { maps: fakeMaps };
  vi.stubGlobal("naver", naverGlobal);
  FakeMap.instances = [];
  FreshFakeMap.instances = [];
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const renderMapCanvas = () =>
  render(
    <MapCanvas
      center={{ lat: 35.1579, lng: 129.0594 }}
      onViewportChange={() => {}}
    />,
  );

const mountUntilMapReady = async () => {
  // React 19: use()로 suspend되는 트리는 awaited act 안에서 렌더해야 재개가 flush된다
  await act(async () => {
    renderMapCanvas();
  });
  await waitFor(() => expect(FakeMap.instances).toHaveLength(1));
};

describe("MapCanvas 스모크 — 인증 실패·내장 컨트롤", () => {
  it("인증 실패(navermap_authFailure + naver.maps null화) 시 크래시 없이 폴백과 '다시 시도'가 렌더된다", async () => {
    await mountUntilMapReady();

    // 검증 리포트 재현 순서: SDK가 naver.maps를 null로 만들며 전역 훅을 호출한다.
    // 이어지는 SDK 하위 트리 언마운트에서 라이브러리 cleanup이 throw해도 앱이 죽으면 안 된다
    act(() => {
      naverGlobal.maps = null;
      window.navermap_authFailure?.();
    });

    expect(screen.getByText("지도를 불러오지 못했어요")).toBeTruthy();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeTruthy();
  });

  it("SDK 내장 축척 컨트롤을 비활성한다 (scaleControl: false — 커스텀 축척 바와 중복 방지)", async () => {
    await mountUntilMapReady();
    expect(FakeMap.instances[0].options.scaleControl).toBe(false);
    // 수술적 변경 — 다른 내장 컨트롤 기본값(생성 옵션 미지정)은 건드리지 않는다
    expect(FakeMap.instances[0].options.zoomControl).toBeUndefined();
    expect(FakeMap.instances[0].options.logoControl).toBeUndefined();
    expect(FakeMap.instances[0].options.mapDataControl).toBeUndefined();
  });

  it("인증 실패 후 재시도의 지도 생성은 재구축된 새 네임스페이스를 통해 일어난다 (라이브러리 캐시의 오염 promise 미사용)", async () => {
    await mountUntilMapReady();

    // 인증 실패: SDK가 naver.maps를 null화하며 전역 훅 호출 → 폴백 전환 + 로더 오염 보고
    act(() => {
      naverGlobal.maps = null;
      window.navermap_authFailure?.();
    });

    // "다시 시도" → 프리플라이트 리셋(잔존 네임스페이스 무효화) + remount → 스크립트 재주입.
    // jsdom은 외부 스크립트를 실행하지 않으므로 load 이벤트 발화 전까지 프리플라이트는 대기 상태
    await act(async () => {
      screen.getByRole("button", { name: "다시 시도" }).click();
    });
    const injected = document.querySelector(
      "script[data-naver-maps-preflight]",
    );
    expect(injected).not.toBeNull();

    // 재실행된 스크립트가 구축하는 새 네임스페이스(인증 실패 원인 해소 후의 정상 SDK)를 모사
    const freshMaps = {
      jsContentLoaded: true,
      Map: FreshFakeMap,
      Event: fakeEvent,
    };
    vi.stubGlobal("naver", { maps: freshMaps });
    await act(async () => {
      injected!.dispatchEvent(new Event("load"));
    });

    // 핵심 단정: 재시도 리마운트의 지도 생성은 새 네임스페이스(B)를 통해야 한다.
    // 라이브러리 훅 캐시가 최초 마운트 시점의 오염 promise(A로 resolve)를 같은 키로
    // 돌려주면 지도가 이전 객체(FakeMap)로 생성되어 이 단정이 실패한다
    await waitFor(() => expect(FreshFakeMap.instances).toHaveLength(1));
    // 이전(오염) 네임스페이스로의 생성은 최초 마운트 1건 그대로 — 재시도가 A를 타면 2건이 된다
    expect(FakeMap.instances).toHaveLength(1);
  });
});
