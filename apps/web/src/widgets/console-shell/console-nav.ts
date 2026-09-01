/** 콘솔 레일·사이드바 공통 항목 — 라벨과 이동 경로 (아이콘은 레일 항목만 별도로 붙인다) */
export interface ConsoleNavItem {
  key: string;
  label: string;
  /** 클릭 시 이동 경로 — 활성 판정 후보에도 포함된다 */
  path: string;
  /**
   * 활성 판정에만 쓰는 추가 경로 — 한 항목이 여러 라우트를 대표할 때 쓴다
   * (관리자 레일 "행사"가 심사 큐와 승인 행사를 함께 덮는 경우).
   */
  matches?: string[];
}

/** 경로가 후보에 속하는가 — 정확 일치 또는 `{candidate}/` 접두 일치 */
const matchedLength = (pathname: string, candidate: string): number =>
  pathname === candidate || pathname.startsWith(`${candidate}/`)
    ? candidate.length
    : 0;

/**
 * 현재 경로가 속한 콘솔 항목 key (MSG-541 AC 5) — 레일 섹션과 사이드바 메뉴가 공유한다.
 *
 * 후보 경로 중 **가장 긴 일치**를 가진 항목이 이긴다: 콘솔 루트(`/org`)가 모든 하위 경로를
 * 삼키지 않게 하려면 구체적인 항목이 이겨야 한다. 접두 비교에 구분자(`/`)를 붙여
 * `/org/guidebook`이 `/org/guide`에 오탐하지 않는다.
 *
 * 순수 함수 — 라우터·플랫폼을 모른다(RN 재사용 대상).
 */
export const activeConsoleNavKey = (
  pathname: string,
  items: ConsoleNavItem[],
): string | undefined => {
  let bestKey: string | undefined;
  let bestLength = 0;
  for (const item of items) {
    for (const candidate of [item.path, ...(item.matches ?? [])]) {
      const length = matchedLength(pathname, candidate);
      if (length > bestLength) {
        bestLength = length;
        bestKey = item.key;
      }
    }
  }
  return bestKey;
};
