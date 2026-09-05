/**
 * 네이버 지도 SDK 프리플라이트 로더 — 지도 경계 전용 웹 코드 (RN 경계: 지도 격리).
 * 소비처는 지도 경계 컴포넌트뿐이다: `pages/map-home/ui/MapCanvas`(유저 지도) ·
 * `pages/org/ui/AreaMapCanvas`(콘솔 위치 영역 지정). 두 번째 소비처가 생기며
 * `pages/map-home/ui/`에서 이 자리로 옮겼다(pages→pages import 회피 — MSG-547).
 *
 * react-naver-maps 0.2.2의 `useNavermaps` 모듈 레벨 promise 캐시는 실패한 promise(거부,
 * 영구 pending, 깨진 네임스페이스로 resolve)를 퇴거하지 않아, remount 재시도가 같은
 * promise로 즉시 재실패한다(내부 loadScript는 exports 제한으로 딥 임포트 불가). 그래서
 * SDK 컴포넌트를 마운트하기 전에 이 로더로 스크립트를 직접 로드해 SDK 준비를 확인한다 —
 * 준비 후에만 마운트되는 라이브러리 로더는 jsContentLoaded를 감지해 즉시 resolve하므로,
 * 실패 promise가 라이브러리 캐시에 들어갈 경로가 사라진다.
 *
 * 인증 실패 잔존 상태(브라우저 관찰로 확정): SDK는 naver.maps를 내부 모듈만 깨진 채
 * 남기고 서브모듈 로드·jsContentLoaded=true까지 진행할 수 있다. 즉 전역 존재도
 * jsContentLoaded도 오염 판별에 충분치 않다 — 유일하게 신뢰 가능한 신호는
 * `window.navermap_authFailure` 훅이며, 그 수신자(MapCanvas)가 markNaverMapsPoisoned로
 * 로더에 알린다. 오염·stale 상태에서의 재로드는 기존 네임스페이스를 무효화하고
 * 스크립트를 재주입한다 = 진짜 네트워크 재시도(재인증 포함).
 */

/** 프리플라이트가 주입한 태그 식별용 data 속성 — 재주입 시 stale 태그 제거에 쓴다 */
const SCRIPT_MARK = "data-naver-maps-preflight";

/** 네이버 공식 로더 URL 조립 — submodules 구분자 ','는 percent-encode 금지(로더가 raw ','로 split) */
export const buildNaverMapsScriptUrl = (
  ncpKeyId: string,
  submodules: readonly string[],
): string => {
  const params = new URLSearchParams({ ncpKeyId });
  const base = `https://oapi.map.naver.com/openapi/v3/maps.js?${params.toString()}`;
  return submodules.length > 0
    ? `${base}&submodules=${submodules.join(",")}`
    : base;
};

/** 인증 실패 관찰 여부 — true면 전역 네임스페이스가 멀쩡해 보여도 신뢰하지 않는다 */
let poisoned = false;

/**
 * 인증 실패 보고 — navermap_authFailure 수신자(MapCanvas)가 호출한다. 이후의 로드
 * 시도는 잔존 네임스페이스를 무효화하고 재주입 경로를 탄다.
 */
export const markNaverMapsPoisoned = (): void => {
  poisoned = true;
};

/** SDK 준비 판정 — 오염 미보고 + 서브모듈까지 로드 완료(jsContentLoaded) */
const isNaverMapsReady = (): boolean =>
  !poisoned &&
  typeof naver !== "undefined" &&
  naver.maps != null &&
  naver.maps.jsContentLoaded === true;

/**
 * jsContentLoaded 대기 상한 (PR #25 리뷰 반영) — load는 왔지만 jsContentLoaded도
 * navermap_authFailure도 영원히 안 오는 경우, 영구 pending이면 호출부(MapCanvas)가
 * "loading"에 갇혀 재시도 없는 무한 aria-busy(조용한 실패)가 된다. 상한 초과 시
 * reject해 기존 실패 경로(MapFallback + 재시도)로 수렴시킨다.
 */
export const JS_CONTENT_LOADED_TIMEOUT_MS = 10_000;

/**
 * jsContentLoaded 대기 — 기존 onJSContentLoaded 핸들러는 보존 호출한다(라이브러리와 동일 규약).
 * 상한 내 미발화면 reject하고, 정상 발화 시 자기 타이머를 정리한다.
 *
 * 타이머는 promise 클로저 로컬이어야 한다 — 모듈 레벨 슬롯을 공유하면, reset 후
 * 재시도가 슬롯에 새 타이머를 넣은 뒤 구(舊) maps 객체에 남은 스테일 핸들러가 늦게
 * 발화할 때 새 시도의 타이머를 지워버려(레이스), 타임아웃이 막으려던 무한 대기가
 * 재발한다. 클로저 로컬이면 각 시도(핸들러·타이머·promise)가 자기 것만 정리한다.
 * reset이 지우지 않는 버려진 시도의 유령 타이머는 무해하다: 늦게 발화해도 자기(버려진)
 * promise만 reject하고, 그 promise는 호출부(MapCanvas effect의 .catch·cancelled 가드)가
 * 핸들러를 이미 부착해 unhandled rejection 없이 소멸한다.
 */
const waitForJsContentLoaded = (maps: typeof naver.maps): Promise<void> =>
  new Promise((resolve, reject) => {
    if (maps.jsContentLoaded) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      reject(
        new Error(
          `naver maps jsContentLoaded not fired within ${JS_CONTENT_LOADED_TIMEOUT_MS}ms`,
        ),
      );
    }, JS_CONTENT_LOADED_TIMEOUT_MS);
    const prev = maps.onJSContentLoaded;
    maps.onJSContentLoaded = () => {
      if (typeof prev === "function") prev();
      clearTimeout(timer);
      resolve();
    };
  });

const removeInjectedScripts = () => {
  document
    .querySelectorAll(`script[${SCRIPT_MARK}]`)
    .forEach((tag) => tag.remove());
};

/**
 * 오염·stale 네임스페이스 무효화 — 재실행된 스크립트가 새로 만드는 것만 신뢰한다.
 * delete가 아닌 대입인 이유: 스크립트 전역 var 선언은 non-configurable일 수 있다
 */
const invalidateNaverNamespace = () => {
  (globalThis as { naver?: unknown }).naver = undefined;
  poisoned = false;
};

const injectScript = (url: string): Promise<void> =>
  new Promise((resolve, reject) => {
    removeInjectedScripts();
    invalidateNaverNamespace();

    const script = document.createElement("script");
    script.setAttribute(SCRIPT_MARK, "");
    script.src = url;
    script.async = true;
    script.addEventListener("load", () => {
      if (typeof naver === "undefined" || naver.maps == null) {
        // 네이버 로더는 load 직후 naver.maps를 노출한다 — 없으면 실패로 판정한다
        script.remove();
        reject(new Error("naver.maps unavailable after script load"));
        return;
      }
      // 인증·서브모듈 로드 완료까지 대기. 인증 실패 신호는 window.navermap_authFailure
      // 전역 훅(MapCanvas)이 담당하고, 그 훅조차 안 오는 영구 대기는 타임아웃이 reject한다
      waitForJsContentLoaded(naver.maps).then(resolve, reject);
    });
    script.addEventListener("error", () => {
      script.remove();
      reject(new Error(`failed to load naver maps script: ${url}`));
    });
    document.head.appendChild(script);
  });

let pending: Promise<void> | null = null;

/**
 * SDK 스크립트 프리플라이트 로드. resolve(= SDK 준비) 후에만 SDK 하위 트리를 마운트할 것.
 * 진행 중 재호출은 같은 promise를 공유하고, settle 시 스스로 pending을 비운다.
 */
export const loadNaverMapsScript = (url: string): Promise<void> => {
  if (isNaverMapsReady()) return Promise.resolve();
  if (!pending) {
    const inFlight: Promise<void> = injectScript(url).finally(() => {
      if (pending === inFlight) pending = null;
    });
    pending = inFlight;
  }
  return pending;
};

/**
 * 재시도 진입점 — 갇힌 pending(인증 실패의 영구 대기), stale 태그, 잔존 네임스페이스를
 * 모두 비워, 다음 loadNaverMapsScript 호출이 재주입 = 진짜 네트워크 재시도가 되게 한다.
 */
export const resetNaverMapsPreflight = (): void => {
  pending = null;
  removeInjectedScripts();
  invalidateNaverNamespace();
};
