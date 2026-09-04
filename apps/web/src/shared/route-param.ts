/**
 * 경로 파라미터 파싱 — 라우트 id의 정본 판정.
 *
 * 신청·행사처럼 서버가 양의 정수 id를 쓰는 자원의 상세 라우트는 전부 이 판정을 거친다.
 * 자리마다 복제하면 방어가 갈린다(MSG-553 codex 1R: 복제 한쪽이 `0`·안전 정수 초과
 * 방어를 잃은 채 머지돼 있었다).
 */

/**
 * 자릿수 문자열 → 양의 안전 정수. 그 외는 전부 null이다.
 *
 * 패턴만으로는 부족하다: `/^\d+$/`는 `0`과 안전 정수를 넘는 숫자열을 통과시키는데,
 * `Number()`가 그 값을 반올림하거나(9007199254740993 → …992 = **다른 자원**) Infinity로
 * 만들어 의도와 다른 id로 조회가 나간다. 유효하지 않은 경로는 요청 없이 안내로 수렴해야 한다.
 *
 * `Number("")`는 0, `Number("12.5")`는 12.5, `Number(" 3 ")`은 3이라 자릿수 패턴이 먼저 걸러야 한다.
 */
export const parsePositiveIntParam = (
  raw: string | undefined,
): number | null => {
  if (raw === undefined || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : null;
};
