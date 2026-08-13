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

/**
 * React 스케줄러 해체 배수 (CI 플레이크 수정 — PR #51).
 * React 19의 스케줄러는 커밋·언마운트 후속 작업을 setImmediate로 미루는데, 파일의
 * 마지막 테스트가 끝나면 vitest가 jsdom 환경(window)을 해체한 뒤에야 그 작업이
 * 실행되어 "window is not defined" unhandled error로 러너가 exit 1이 된다
 * (use-upload-location.test.tsx에서 CI 실증 — 느린 러너에서만 표면화).
 * 매 테스트 뒤 명시적 unmount(cleanup) 후 이벤트 루프를 두 바퀴 양보해, window가
 * 살아 있는 동안 잔여 스케줄러 작업을 소진시킨다 (테스트당 ~1ms).
 * setImmediate는 이 파일의 tsconfig(DOM lib)에 없어 setTimeout(0)을 쓴다 —
 * immediate(check 단계)는 다음 타이머 단계보다 먼저 돌므로 배수 효과는 동일하다.
 */
const { cleanup } = await import("@testing-library/react");
const { afterEach } = await import("vitest");
afterEach(async () => {
  cleanup();
  // 두 바퀴 양보 — 스케줄러가 5ms 프레임을 넘겨 yield하면 다음 immediate로 재예약된다
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
});
