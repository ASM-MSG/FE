/**
 * 클래스 문자열 조합 헬퍼.
 * 웹 cn(clsx + tailwind-merge)과 달리 RN은 CSS 캐스케이드 충돌 병합이 필요 없어
 * falsy 필터링 + join만 수행한다.
 */
export const cx = (
  ...parts: Array<string | false | null | undefined>
): string => parts.filter(Boolean).join(" ");
