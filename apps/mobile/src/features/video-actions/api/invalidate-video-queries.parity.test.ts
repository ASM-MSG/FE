import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * L6 parity: 삭제 성공 후 **무효화 대상 쿼리 패밀리 집합**이 웹과 같다 (MSG-431 재작업).
 *
 * **왜 값 대조가 아니라 소스 대조인가.** 다른 parity 테스트(`report`·`video-menu`·
 * `grid-5179`)는 웹 원본을 동적 import해 **반환값**을 대조한다. 여기서는 그 방법이
 * 성립하지 않는다 — 웹의 무효화 집합은 순수 함수가 아니라 `useDeleteVideo`의
 * `onSuccess` **콜백 안에 인라인**돼 있고(웹 `use-video-mutations.ts`), 꺼내려면 훅을
 * 렌더해야 하는데 모바일에는 RN 렌더 테스트 인프라가 없다(`vitest.config.ts` 정책).
 * 모바일만 이 배선을 순수 함수(`invalidateAfterVideoDelete`)로 분리해 뒀기 때문에
 * 대칭 대조가 불가능하다.
 *
 * 그래서 **드리프트가 실제로 일어나는 축**만 고정한다: 어느 쿼리 패밀리가 무효화
 * 대상인가. 웹이 키를 추가/제거하면 이 테스트가 깨져 모바일이 조용히 갈리는 것을 막는다.
 * 반대로 **증명하지 못하는 것**도 분명하다 — 부분 키(`_id`) 방식인지, `remove`인지
 * `invalidate`인지 같은 호출 형태의 동등성은 아래 2·3번 단정이 문자열로만 확인하고,
 * 실제 캐시 상태 관찰은 자매 파일 `invalidate-video-queries.test.ts`(실 `QueryClient`)가
 * 맡는다. 두 파일이 짝이다.
 *
 * 위임 구조가 플랫폼별로 다르므로(웹은 `getUploadHistoryQueryKey`를 삭제 훅에서 직접
 * 부르고, 모바일은 `invalidateGridQueries`에 맡긴다) **삭제 경로 전체의 합집합**을
 * 비교한다 — 어느 파일이 부르는지가 아니라 무엇이 무효화되는지가 계약이다.
 */
const readSource = (relative: string): string =>
  readFileSync(new URL(relative, import.meta.url), "utf8");

/** 소스 조각에서 생성 쿼리 키 팩토리 이름을 모은다 (정렬된 중복 없는 목록) */
const queryKeyFactories = (source: string): string[] =>
  [...new Set(source.match(/get[A-Za-z]+QueryKey/g) ?? [])].sort();

/** `start`가 처음 나오는 자리부터 `end` 직전까지 — 함수 본문 한 덩어리를 떼어낸다 */
const sliceBetween = (source: string, start: string, end: string): string => {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + 1);
  // 웹/모바일이 리팩터로 이 앵커를 잃으면 잘못된 통과가 아니라 실패로 드러나야 한다
  expect(from, `앵커 "${start}"를 찾지 못했다`).toBeGreaterThanOrEqual(0);
  expect(to, `앵커 "${end}"를 찾지 못했다`).toBeGreaterThan(from);
  return source.slice(from, to);
};

const WEB_VIDEO_MUTATIONS = readSource(
  "../../../../../web/src/features/video-actions/api/use-video-mutations.ts",
);
const WEB_GRID_INVALIDATE = readSource(
  "../../../../../web/src/features/upload/api/invalidate-grid-queries.ts",
);
const MOBILE_VIDEO_INVALIDATE = readSource("./invalidate-video-queries.ts");
const MOBILE_GRID_INVALIDATE = readSource(
  "../../upload/api/invalidate-grid-queries.ts",
);

/** 웹 삭제 경로 = `useDeleteVideo` 본문 (다음 export 선언 직전까지) */
const webDeletePath = sliceBetween(
  WEB_VIDEO_MUTATIONS,
  "export const useDeleteVideo",
  "export interface SetVideoVisibilityInput",
);

/** 모바일 삭제 경로 = `invalidateAfterVideoDelete` 본문 (다음 선언 직전까지) */
const mobileDeletePath = sliceBetween(
  MOBILE_VIDEO_INVALIDATE,
  "export const invalidateAfterVideoDelete",
  "interface PlaybackEnvelopeSlice",
);

describe("삭제 후 무효화 집합 ↔ 웹 원본 동등성 (L6 parity)", () => {
  it("삭제 경로가 건드리는 쿼리 패밀리 합집합이 웹과 같다 — 위임 구조 차이는 무시한다", () => {
    const web = queryKeyFactories(webDeletePath + WEB_GRID_INVALIDATE);
    const mobile = queryKeyFactories(mobileDeletePath + MOBILE_GRID_INVALIDATE);

    // 대조가 빈 집합끼리의 동어반복이 되지 않게 규모를 먼저 고정한다
    expect(web.length).toBeGreaterThanOrEqual(12);
    expect(mobile).toEqual(web);
  });

  it("양쪽 모두 삭제된 영상의 playback 캐시를 무효화가 아니라 제거한다 — 재조회는 404다", () => {
    const removesPlayback = /removeQueries\(\{\s*queryKey: getPlaybackQueryKey/;

    expect(webDeletePath).toMatch(removesPlayback);
    expect(mobileDeletePath).toMatch(removesPlayback);
  });

  it("양쪽 모두 격자 계열을 invalidateGridQueries에 위임한다 — 점령 롤백 명세의 공통 경로", () => {
    expect(webDeletePath).toContain("invalidateGridQueries(queryClient");
    expect(mobileDeletePath).toContain("invalidateGridQueries(queryClient");
  });
});

/**
 * 공개 범위 전환은 **의도된 분기**라 parity 대상이 아니다 — 웹은 playback을 무효화하지만
 * 모바일은 응답값을 seed한다(승인 결정: `GET /api/videos/{videoId}`가 조회수를 올려
 * 시트를 여닫을 때마다 카운트가 두 번씩 오른다). 갈린 것이 사고가 아니라 결정임을
 * 여기서 고정해 둔다 — 나중에 웹을 따라 무효화로 되돌리면 이 단정이 먼저 깨진다.
 */
describe("공개 범위 전환은 의도된 플랫폼 분기다 (L7)", () => {
  it("모바일은 전환 성공 시 playback을 무효화하지 않고 seed한다", () => {
    const seed = sliceBetween(
      MOBILE_VIDEO_INVALIDATE,
      "export const seedPlaybackVisibility",
      // 파일 끝까지 — 마지막 선언이라 뒤 앵커가 없다
      "};",
    );

    expect(seed).toContain("setQueryData");
    expect(seed).not.toContain("invalidateQueries");
  });
});
