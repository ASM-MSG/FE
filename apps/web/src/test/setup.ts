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
