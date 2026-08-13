# FE 테스트 템플릿 — 유형 선택 매트릭스와 단정 범위

수용 기준을 테스트로 옮길 때 **여기 있는 5개 유형 중에서 골라** 그 구조와 단정 범위를 따른다.
목적은 "의미 없는 테스트"(구현 세부 단정, 동어반복, 커버리지용 빈 실행)를 구조적으로 차단하는 것.
근거는 Testing Trophy(Kent C. Dodds)·Testing Library 공식 원칙·zustand/TanStack Query 공식 테스트
가이드 — 출처는 말미. 코드 스켈레톤은 이 저장소의 실제 관례(수동 스토어 리셋, fetch 스텁,
`envelopeResponse`)를 정본으로 한다.

## 선택 매트릭스

수용 기준의 검증 대상이 무엇인지로 고른다. 하나의 기준이 두 유형에 걸치면 낮은 번호(더 싼 층)를
먼저 검토하고, 그 층에서 관찰 불가한 부분만 위 층을 추가한다.

| 검증 대상 | 유형 | 파일 위치·이름 |
|----------|------|---------------|
| 입력→출력 계산 (포맷터·파생·매핑·상태머신 전이) | ① 순수 로직 | 대상 옆 `*.test.ts` |
| zustand 스토어의 액션→상태 변화 | ② 스토어 | 대상 옆 `*.test.ts` |
| TanStack Query 훅의 데이터·에러·캐시 계약 | ③ 쿼리 훅 | 대상 옆 `*.test.tsx` |
| 단일 컴포넌트의 렌더·상호작용 계약 | ④ 컴포넌트 스모크 | 대상 옆 `*.smoke.test.tsx` |
| 여러 유닛이 협업하는 사용자 흐름 (위저드 전환 등) | ⑤ 흐름 스모크 | 페이지/도메인의 `*.smoke.test.tsx` |

**배분 원칙(Trophy):** 로직이 실제로 분기하는 곳에만 ①~③을 촘촘히, 화면 계약은 ④·⑤로 넓게.
커버리지 숫자는 목표가 아니라 누락 탐지 도구다 — 커버리지를 채우기 위한 테스트는 만들지 않는다.
④·⑤는 검증 스킬의 "뷰 스모크 승격 기준"(안정된 사용자 흐름만)을 따른다.

## 전 유형 공통 규칙

- **AAA 구조**: 준비(Arrange) — 실행(Act) — 단정(Assert)을 빈 줄로 구획한다. 한 테스트에서
  실행-단정 쌍이 반복되면 테스트를 쪼갠다
- **테스트명 = 수용 기준 문장**: "~하면 ~된다" 형태 + AC 번호를 괄호로 (`"칩을 탭하면 그 테마가
  활성화된다 (AC 3)"`) — 테스트가 곧 기획의 번역이다
- **쿼리 우선순위**: `getByRole`(접근 가능한 이름 포함)이 1순위, `getByLabelText`·`getByText` 순.
  `getByTestId`·`container.querySelector`는 금지 수준의 최후 수단. 부재 단정에만 `queryBy*`
- **네트워크 경계에서 한 번만 mock**: `vi.stubGlobal("fetch", ...)` + `@/test/envelope-response`.
  모듈(vi.mock) 단위 mock은 통합 신뢰를 없애므로 훅·스토어·유틸에는 쓰지 않는다
  (업스트림 권장은 MSW — 도입은 별도 티켓 결정, 템플릿이 라이브러리를 늘리지 않는다)
- **상태 누수 차단**: mock은 `afterEach`에서 복원(`vi.unstubAllGlobals`·`vi.restoreAllMocks`),
  스토어는 beforeEach 리셋(② 참조), QueryClient는 테스트마다 새로(③ 참조)
- **금지**: 대형 스냅샷, 단정 없는 실행(assertion-free), 내부 헬퍼 호출 여부 감시(vi.spyOn으로
  내부 구현 감시), 스타일·className·DOM 구조 단정

## ① 순수 로직 (유틸·파생·매핑·상태머신)

✅ 단정: 입력→출력 값. 대표 케이스 + 경계값(빈 입력·null·최대치). 유일하게 값 자체를 촘촘히
단정해도 되는 층이다.
❌ 금지: 내부 호출 순서, 중간 변수, 헬퍼가 호출됐는지.

```ts
import { describe, expect, it } from "vitest";
import { deriveStaleTime } from "./video-playback";

describe("deriveStaleTime — presigned 만료 기반 staleTime 유도 (AC 5)", () => {
  it("expiresInSec에서 30초 마진을 빼 ms로 환산한다", () => {
    expect(deriveStaleTime(300)).toBe(270_000);
  });

  it("마진보다 짧게 남으면 0으로 바닥친다 (경계)", () => {
    expect(deriveStaleTime(10)).toBe(0);
  });
});
```

## ② zustand 스토어

✅ 단정: `getState()`로 본 액션 실행 전/후의 **공개 상태 계약**. 연동 규칙(한 스토어 액션이 다른
스토어를 바꾸는 계약)도 이 층.
❌ 금지: 상태 객체 전체 스냅샷, `set` 호출 횟수, UI 반영(→ ④/⑤의 몫).

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useThemeFilterStore } from "./theme-filter-store";

describe("useThemeFilterStore — 테마 칩 단일 선택 토글 (AC 4)", () => {
  beforeEach(() => {
    // 저장소 관례: 수동 리셋 (setState 두 번째 인자 true = replace)
    useThemeFilterStore.setState(useThemeFilterStore.getInitialState(), true);
  });

  it("활성 칩이 있는 상태에서 다른 칩을 탭하면 새 칩만 활성화된다 (AC 4)", () => {
    useThemeFilterStore.getState().toggle("hot");

    useThemeFilterStore.getState().toggle("festival");

    expect(useThemeFilterStore.getState().activeTheme).toBe("festival");
  });
});
```

## ③ TanStack Query 훅

✅ 단정: `waitFor(isSuccess)` 후 data의 **의미 있는 필드**(뷰가 실제로 소비하는 것), 에러 응답 시
`isError` 계약, 병합·select 결과. 캐시 계약(staleTime 등)은 관찰 가능한 동작으로.
❌ 금지: fetch가 어떤 URL·헤더로 불렸는지 자체를 목적으로 단정(스텁이 pathname 분기로 이미 계약을
강제한다), queryKey 문자열, 캐시 내부 구조.

```tsx
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { envelopeResponse } from "@/test/envelope-response";
import { useGridVideosQuery } from "./use-grid-videos-query";

// 테스트마다 새 QueryClient + retry: false (에러 시나리오 타임아웃 방지)
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
);

describe("useGridVideosQuery — 전역+내 영상 병합 (AC 7)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("내 영상이 앞에 오고 videoId 중복은 제거된다 (AC 7)", async () => {
    vi.stubGlobal("fetch", async (request: Request) => {
      const { pathname } = new URL(request.url);
      if (pathname.endsWith("/my-videos")) return envelopeResponse([myDto(2)]);
      return envelopeResponse({ videos: [dto(1), dto(2)], hasNext: false });
    });

    const { result } = renderHook(() => useGridVideosQuery("39064_112221"), { wrapper });

    await waitFor(() => expect(result.current.isPending).toBe(false));
    expect(result.current.items.map((v) => v.videoId)).toEqual([2, 1]);
  });
});
```

## ④ RTL 컴포넌트 스모크 (단일 컴포넌트)

✅ 단정: role·접근 가능한 이름 기반 렌더 존재, 상호작용(클릭·입력) 후 **화면에 보이는 변화**,
콜백 prop 호출 계약. 파일 상단 JSDoc으로 "이 스모크가 고정하는 계약"의 범위를 선언한다.
❌ 금지: 내부 state·훅 반환값, 자식에 props가 전달됐는지, 자주 바뀌는 문구·스타일 단정
(스모크 승격 기준과 동일 — 안정 계약만).

```tsx
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FeedVideoCard } from "./FeedVideoCard";

/** 피드 카드 스모크 — "접근성 이름 있는 button + onSelect" 계약만 고정. 메타 문구 분기는 패널 렌더가 커버. */
describe("피드 영상 카드 (AC 4)", () => {
  afterEach(() => cleanup());

  it("클릭 시 onSelect가 호출된다 (AC 4)", () => {
    const onSelect = vi.fn();
    render(<FeedVideoCard video={VIDEO} mine position={1} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: /거리 야경/ }));

    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
```

(업스트림 권장은 `userEvent`지만 미설치 — 설치 전까지 `fireEvent`가 저장소 정본. 도입은 별도 결정)

## ⑤ 흐름(flow) 통합 스모크

✅ 단정: 사용자 시나리오의 완주 — "스텝 1에서 파일 선택 → 다음 → 스텝 2 표시"처럼 여러 유닛
(스토어+훅+컴포넌트)의 협업 결과를 실제 조립으로 검증. `@/test/render-with-providers` 사용.
티켓의 핵심 화면 수용 기준 1개 = 흐름 1개.
❌ 금지: 중간 단계 내부 상태 들여다보기, ①~④가 이미 단정한 세부의 중복, 특정 내부 함수 호출 여부.

기존 예: `features/upload/ui/upload-wizard-flow.smoke.test.tsx` (위저드 4케이스), `pages/map-home/map-home-panel-switch.smoke.test.tsx`.

## 안티패턴 요약 (검증 스킬의 테스트 감사 기준과 연동)

| 안티패턴 | 왜 무의미한가 |
|----------|--------------|
| 구현 세부 단정 (내부 state·구조·호출 순서) | 리팩토링에 깨지고(거짓 음성) 실제 버그는 통과(거짓 양성) |
| 동어반복 — stub이 X를 주게 하고 결과가 X인지 단정 | 기대와 실행이 동치라 구현의 거울일 뿐, 아무것도 검증 안 함 |
| 커버리지용 단정 없는 실행 | green bar만 만드는 고무도장 |
| 대형 스냅샷 | 아무도 리뷰하지 않고 "다시 찍기"로 갱신됨 |
| testid·querySelector 우선 쿼리 | 사용자가 관찰할 수 없는 방식 — 접근성 계약을 놓침 |
| 과도한 모듈 mock | 통합 신뢰 소멸, "mock을 테스트"하게 됨 |

단, test-first 특성상 구현·테스트 간 **스펙 명시값·mock 수치의 단순 리터럴 일치는 동어반복이
아니다** (검증 스킬의 기존 판정 기준과 동일) — 동어반복은 "stub 반환값을 그대로 다시 단정"하는
구조를 말한다.

## 출처

- Kent C. Dodds — [Write tests. Not too many. Mostly integration.](https://kentcdodds.com/blog/write-tests) · [Testing Trophy](https://kentcdodds.com/blog/static-vs-unit-vs-integration-vs-e2e-tests) · [Testing Implementation Details](https://kentcdodds.com/blog/testing-implementation-details) · [Common Mistakes with RTL](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) · [Effective Snapshot Testing](https://kentcdodds.com/blog/effective-snapshot-testing)
- [Testing Library Guiding Principles](https://testing-library.com/docs/guiding-principles/) · [쿼리 우선순위](https://testing-library.com/docs/queries/about/#priority)
- [zustand 공식 테스트 가이드](https://zustand.docs.pmnd.rs/learn/guides/testing) · [TanStack Query 테스트 가이드](https://tanstack.com/query/latest/docs/framework/react/guides/testing) · [Vitest Mocking](https://vitest.dev/guide/mocking.html)
- Martin Fowler — [GivenWhenThen](https://martinfowler.com/bliki/GivenWhenThen.html) · [TestCoverage](https://martinfowler.com/bliki/TestCoverage.html) · [AssertionFreeTesting](https://martinfowler.com/bliki/AssertionFreeTesting.html)
