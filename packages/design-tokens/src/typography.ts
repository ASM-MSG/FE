/**
 * SOURCE: Figma "FeelMap Typography" Text Styles (node 13402:687)
 * 폰트는 Inter — 웹은 font-family: Inter + font-weight로 처리한다.
 * (RN용 굵기별 폰트 파일 매핑은 모바일 앱 추가 시점에 처리)
 */

export const fontFamily = {
  sans: "Inter",
} as const;

export interface TypographyToken {
  fontWeight: 400 | 500 | 600 | 700;
  fontSize: number; // px 기준
  lineHeight: number; // px 기준
  letterSpacing: number; // px 기준
}

/** 이름은 Figma Text Styles(FeelMap/*)와 1:1 */
export const typography = {
  /** FeelMap/Display — 모달 타이틀 */
  display: { fontWeight: 600, fontSize: 20, lineHeight: 26, letterSpacing: 0 },
  /** FeelMap/Heading — 화면 헤더 */
  heading: { fontWeight: 500, fontSize: 16, lineHeight: 20, letterSpacing: 0 },
  /** FeelMap/Title — 시트 타이틀 */
  title: { fontWeight: 600, fontSize: 15, lineHeight: 19, letterSpacing: 0 },
  /** FeelMap/Base — 본문/입력 */
  base: { fontWeight: 400, fontSize: 14, lineHeight: 20, letterSpacing: 0 },
  /** FeelMap/Body Strong — 카드 제목 */
  "body-strong": { fontWeight: 600, fontSize: 13, lineHeight: 17, letterSpacing: 0 },
  /** FeelMap/Body — 본문 보조 */
  body: { fontWeight: 400, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  /** FeelMap/Label — 라벨/버튼 보조 */
  label: { fontWeight: 500, fontSize: 12, lineHeight: 15, letterSpacing: 0 },
  /** FeelMap/Caption — 캡션/메타 */
  caption: { fontWeight: 400, fontSize: 11, lineHeight: 14, letterSpacing: 0 },
} as const satisfies Record<string, TypographyToken>;

export type TypographyVariant = keyof typeof typography;
