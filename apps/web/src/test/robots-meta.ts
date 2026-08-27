/**
 * `<meta name="robots">` 테스트 헬퍼 (MSG-478 E1) — 정적 셸(index.html)이 심는 robots 메타를
 * jsdom에 대역으로 심고, 현재 head의 robots 메타 목록을 읽는다. 훅 단위 테스트와
 * 에러 화면 스모크가 같은 헬퍼를 복제하게 되어 추출했다 (중복 게이트 검출).
 */

/** 정적 셸 대역 — robots 메타 1개를 head에 심는다 */
export const seedRobotsMeta = (content: string): void => {
  const meta = document.createElement("meta");
  meta.name = "robots";
  meta.content = content;
  document.head.appendChild(meta);
};

/** head의 robots 메타 전부 (개수 단정용) */
export const robotsMetas = (): HTMLMetaElement[] => [
  ...document.head.querySelectorAll<HTMLMetaElement>('meta[name="robots"]'),
];

/** head의 robots 메타 content 목록 — 길이가 1이 아니면 메타가 중복 생성된 것 */
export const robotsContents = (): string[] =>
  robotsMetas().map((m) => m.content);

/** afterEach용 — 심어 둔 robots 메타를 전부 제거한다 */
export const clearRobotsMetas = (): void => {
  for (const meta of robotsMetas()) meta.remove();
};
