/**
 * vitest 공통 셋업 (jsdom 환경 보정).
 *
 * Node 22+는 globalThis에 실험적 localStorage getter를 정의하는데, --localstorage-file
 * 플래그 없이는 undefined를 반환하면서 jsdom이 제공하는 localStorage를 가린다
 * (sessionStorage는 Node 내장 in-memory 구현이 있어 정상 동작하는 비대칭).
 * 브라우저와 동일한 Storage 계약의 최소 in-memory 구현으로 대체한다 — 테스트 전용이며,
 * 프로덕션 코드는 shared/storage 어댑터를 통해 실제 localStorage를 사용한다.
 * 테스트 파일별로 환경이 새로 만들어지므로 파일 간 스토리지 격리는 유지된다.
 */
if (globalThis.localStorage === undefined) {
  const store = new Map<string, string>();
  const localStorageShim: Storage = {
    get length() {
      return store.size;
    },
    clear: () => {
      store.clear();
    },
    getItem: (key) => store.get(key) ?? null,
    key: (index) => [...store.keys()][index] ?? null,
    removeItem: (key) => {
      store.delete(key);
    },
    setItem: (key, value) => {
      store.set(key, String(value));
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    value: localStorageShim,
    configurable: true,
  });
}

/**
 * API 에러 정규화 인터셉터 등록 (MSG-325).
 * 앱은 main.tsx 부트스트랩에서 1회 등록하는데, 테스트는 그 진입점을 타지 않아
 * 실패 응답이 정규화되지 않은 **원시 봉투**로 도착했다 — 화면이 developCode로
 * 분기하는 코드를 테스트가 검증하지 못하는 사각이었다. 앱과 같은 조건으로 맞춘다.
 */
const { registerApiErrorInterceptor } =
  await import("@/shared/api/error-interceptor");
registerApiErrorInterceptor();
