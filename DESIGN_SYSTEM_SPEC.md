# DESIGN_SYSTEM_SPEC.md — 모노레포 디자인 시스템 구축 지시서

> **이 문서를 읽는 Claude에게**: 이 문서는 작업 지시서다. 사용자가 "이 문서대로 진행해줘"라고 하면
> 아래 스펙대로 프로젝트를 세팅한다. 진행 순서는 맨 아래 [11. 적용 순서]를 따르고,
> 각 단계마다 무엇을 했는지 간단히 보고한다. 값이 필요한데 문서에 없으면
> (예: Figma URL, 브랜드 컬러) 임의로 만들지 말고 사용자에게 물어본다.

---

## 0. 프로젝트 개요와 기술 전제

- **형태**: pnpm workspace 모노레포. 웹(React) + 앱(React Native) 동시 개발
- **웹**: React(Next.js 또는 Vite — 사용자에게 확인) + **Tailwind CSS + shadcn/ui + CVA(class-variance-authority)**
- **앱**: **Expo(React Native) + NativeWind v4** (Tailwind v3.4 기준 — NativeWind와 preset 공유를 위해)
- **언어**: TypeScript
- **디자인 원본**: **Figma** (사용자가 URL 제공). 토큰 값은 Figma에서 추출하며, 이 문서의 값은 참고용 예시다.
- **핵심 원칙**:
  1. 디자인 토큰은 순수 데이터 패키지(`design-tokens`) 하나가 유일한 출처(single source of truth)
  2. 컴포넌트 구현은 플랫폼별(`ui-web`/`ui-native`)로 분리하되 **props API(variant 타입)는 공유**
  3. 도메인 지식은 packages에 절대 넣지 않는다 (앱의 features/entities로)

---

## 1. 전체 폴더 구조

```
프로젝트루트/
├── pnpm-workspace.yaml
├── package.json
├── docs/
│   ├── DESIGN_SYSTEM.md          # 토큰 규칙 + 컴포넌트 컨벤션 (이 문서 기반으로 작성)
│   └── FIGMA_WORKFLOW.md         # Figma → 코드 작업 절차 ([9]번 내용 기반)
│
├── packages/                     # ── 플랫폼 공통 (도메인 지식 금지) ──
│   ├── design-tokens/            # ★ Figma에서 추출한 토큰. 유일한 출처
│   │   ├── package.json          #   name: "@my/design-tokens" (스코프명은 프로젝트에 맞게)
│   │   └── src/
│   │       ├── colors.ts         #   Figma Variables/Color Styles와 1:1
│   │       ├── typography.ts     #   Figma Text Styles와 1:1
│   │       ├── spacing.ts
│   │       ├── radius.ts
│   │       ├── variants.ts       #   컴포넌트 공용 props 타입
│   │       └── index.ts
│   ├── tailwind-preset/          # 토큰 → Tailwind theme 변환 (웹/앱 공용)
│   │   └── index.ts
│   ├── ui-web/                   # shadcn + CVA 웹 컴포넌트
│   │   └── src/
│   │       ├── button.tsx
│   │       ├── lib/utils.ts      #   cn() 헬퍼
│   │       └── index.ts          #   배럴 익스포트
│   ├── ui-native/                # NativeWind RN 컴포넌트 (ui-web과 같은 API)
│   │   └── src/
│   │       ├── Button.tsx
│   │       ├── hooks/            #   usePressAnimation 등 RN 전용 인터랙션 훅
│   │       └── index.ts
│   └── shared/                   # (선택) 순수 TS 공통: API 타입, 유틸, 상수
│       └── src/ (types/, utils/)
│
└── apps/                         # ── 도메인/화면 (FSD 레이어) ──
    ├── web/
    │   ├── tailwind.config.ts    # tailwind-preset 사용
    │   └── src/
    │       ├── app/              # 라우팅·프로바이더
    │       ├── pages/            # 페이지 조립 (FSD pages 레이어)
    │       ├── widgets/          # Header, Sidebar 등 조합 블록
    │       ├── features/         # 도메인 기능 (api + model + ui)
    │       ├── entities/         # 도메인 모델
    │       ├── shared/           # 웹 전용 훅·유틸 (재사용 컴포넌트 금지!)
    │       └── styles/globals.css # shadcn CSS 변수 (토큰과 동기화)
    └── mobile/
        ├── tailwind.config.js    # 같은 preset + nativewind/preset
        ├── global.css
        ├── app/                  # expo-router 라우팅
        ├── widgets/              # TopNav, BottomNav 등
        ├── features/
        ├── entities/
        └── shared/               # 앱 전용 훅·스토어 (재사용 컴포넌트 금지!)
```

```yaml
# pnpm-workspace.yaml
packages:
  - "apps/*"
  - "packages/*"
```

**의존 방향 (역방향 금지)**:

- `apps/web` → `ui-web` → `design-tokens`
- `apps/mobile` → `ui-native` → `design-tokens`
- `tailwind-preset` → `design-tokens`

**소속 판단 기준**:

- "웹과 앱 둘 다 쓰나?" → `packages/`
- "도메인(비즈니스)을 아나?" → 안다면 무조건 `apps/*/features|entities`
- "한 앱에서만 쓰는 훅/유틸인가?" → 그 앱의 `shared/`
- ⚠️ `apps/*/shared`에는 절대 재사용 UI 컴포넌트를 만들지 않는다. 재사용 컴포넌트가 필요해지면 그것은 `packages/ui-*`로 갈 신호다.

---

## 2. `packages/design-tokens` — 토큰 패키지

**규칙: 이 패키지는 `react`, `react-native` 등 어떤 UI 라이브러리도 import하지 않는다. 순수 상수만.**

> ⚠️ 아래 코드의 색상/타이포 값은 **참고 프로젝트(pico-world)의 예시값**이다.
> 실제 값은 [9. Figma 연동 워크플로우]에 따라 사용자의 Figma에서 추출해 채운다.

### `src/colors.ts` — 원시/시맨틱 2계층

```ts
/** 원시(primitive) 토큰 — 컴포넌트에서 직접 쓰지 않는 것을 권장 */
export const grayscale = {
  black: "#000000",
  gray950: "#101010",
  gray900: "#191919",
  gray800: "#202020",
  gray700: "#353535",
  gray600: "#525252",
  gray500: "#737373",
  gray400: "#909090",
  gray300: "#A7A7A7",
  gray200: "#CECECE",
  gray100: "#E7E7E7",
  gray50: "#F9F9F9",
  white: "#FFFFFF",
} as const;

/** 시맨틱 토큰 — 용도 기반 이름. shadcn CSS 변수와 1:1 대응. 값은 Figma에서 추출 */
export const semantic = {
  background: grayscale.white,
  foreground: grayscale.gray900,
  primary: "#TODO_FIGMA", // 브랜드 컬러 — Figma에서 추출
  primaryForeground: grayscale.white,
  muted: grayscale.gray50,
  mutedForeground: grayscale.gray500,
  border: grayscale.gray100,
  destructive: "#TODO_FIGMA",
} as const;
```

### `src/typography.ts` — CSS 조각이 아닌 숫자 데이터로

RN은 굵기가 `fontWeight`가 아니라 `fontFamily`로 갈리므로 `fontFamily`를 키로 두고, 웹에서는 weight로 변환한다.

```ts
/** RN 기준 폰트 패밀리명. 웹에서는 fontWeightMap으로 weight 변환 */
export const fontFamily = {
  bold: "Pretendard-Bold",
  semibold: "Pretendard-SemiBold",
  medium: "Pretendard-Medium",
  regular: "Pretendard-Regular",
} as const;

export const fontWeightMap = {
  "Pretendard-Bold": 700,
  "Pretendard-SemiBold": 600,
  "Pretendard-Medium": 500,
  "Pretendard-Regular": 400,
} as const;

export interface TypographyToken {
  fontFamily: keyof typeof fontWeightMap;
  fontSize: number; // px 기준
  lineHeight: number; // px 기준
  letterSpacing: number; // px 기준
}

/** 이름은 Figma Text Styles와 1:1. 아래는 예시 스케일 — 실제 값은 Figma에서 추출 */
export const typography = {
  h1: {
    fontFamily: fontFamily.bold,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: -0.64,
  },
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: 28,
    lineHeight: 36,
    letterSpacing: -0.56,
  },
  h3: {
    fontFamily: fontFamily.bold,
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.48,
  },
  h4: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  "title1-bold": {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.36,
  },
  "title1-semibold": {
    fontFamily: fontFamily.semibold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.36,
  },
  "title1-medium": {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.36,
  },
  "title2-bold": {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
  },
  "title2-semibold": {
    fontFamily: fontFamily.semibold,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
  },
  "title2-medium": {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: -0.32,
  },
  "title3-bold": {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: -0.28,
  },
  "title3-semibold": {
    fontFamily: fontFamily.semibold,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: -0.28,
  },
  "title3-medium": {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 16,
    letterSpacing: -0.28,
  },
  "title4-bold": {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
  },
  "title4-semibold": {
    fontFamily: fontFamily.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
  },
  "title4-medium": {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: -0.24,
  },
  b1: {
    fontFamily: fontFamily.regular,
    fontSize: 18,
    lineHeight: 28,
    letterSpacing: -0.36,
  },
  b2: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: -0.32,
  },
  b3: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.28,
  },
} as const satisfies Record<string, TypographyToken>;

export type TypographyVariant = keyof typeof typography;
```

### `src/spacing.ts` / `src/radius.ts`

```ts
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;
export const radius = { sm: 8, md: 12, lg: 16, full: 999 } as const;
```

### `src/variants.ts` — 웹/앱 컴포넌트가 공유하는 API 계약

```ts
export type ButtonSize = "large" | "medium" | "small";
export type ButtonColor = "primary" | "secondary" | "outline";

export interface ButtonBaseProps {
  size?: ButtonSize; // 기본 "large"
  color?: ButtonColor; // 기본 "primary"
  disabled?: boolean;
}

// 새 공통 컴포넌트를 만들 때마다 여기에 XxxBaseProps를 추가한다.
```

### `src/index.ts`

위 파일 전부 re-export.

---

## 3. `packages/tailwind-preset` — 토큰을 Tailwind로 변환

웹과 NativeWind가 **같은 preset**을 쓰게 하는 것이 이 패키지의 존재 이유다.

```ts
// index.ts
import {
  grayscale,
  semantic,
  typography,
  spacing,
  radius,
  fontWeightMap,
} from "@my/design-tokens";
import type { Config } from "tailwindcss";

const px = (n: number) => `${n}px`;

export const preset: Omit<Config, "content"> = {
  theme: {
    extend: {
      colors: {
        ...grayscale, // bg-gray500, text-gray900 ...
        background: semantic.background, // bg-background (shadcn 호환)
        foreground: semantic.foreground,
        primary: {
          DEFAULT: semantic.primary,
          foreground: semantic.primaryForeground,
        },
        muted: {
          DEFAULT: semantic.muted,
          foreground: semantic.mutedForeground,
        },
        border: semantic.border,
        destructive: semantic.destructive,
      },
      fontSize: Object.fromEntries(
        // text-h1, text-title2-bold 처럼 타이포 토큰을 클래스 하나로
        Object.entries(typography).map(([name, t]) => [
          name,
          [
            px(t.fontSize),
            {
              lineHeight: px(t.lineHeight),
              letterSpacing: px(t.letterSpacing),
              fontWeight: String(fontWeightMap[t.fontFamily]),
            },
          ],
        ]),
      ),
      spacing: Object.fromEntries(
        Object.entries(spacing).map(([k, v]) => [k, px(v)]),
      ),
      borderRadius: Object.fromEntries(
        Object.entries(radius).map(([k, v]) => [k, px(v)]),
      ),
    },
  },
};
```

### 각 앱의 설정

```ts
// apps/web/tailwind.config.ts
import { preset } from "@my/tailwind-preset";
export default {
  presets: [preset],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui-web/src/**/*.{ts,tsx}"],
};
```

```js
// apps/mobile/tailwind.config.js
const { preset } = require("@my/tailwind-preset");
module.exports = {
  presets: [preset, require("nativewind/preset")],
  content: [
    "./app/**/*.{ts,tsx}",
    "./widgets/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "../../packages/ui-native/src/**/*.{ts,tsx}",
  ],
};
```

**⚠️ RN 주의점 2가지**:

1. RN에서 `fontWeight`만으로 굵기가 안 바뀐다. NativeWind에서는 타이포 클래스와 함께 `font-[Pretendard-Bold]` 계열 fontFamily 유틸을 같이 쓰거나, preset의 `fontFamily` 항목에 등록해 사용한다. 폰트 파일은 expo-font로 로드.
2. 각 앱 tailwind config의 `content`에 **ui 패키지 경로를 반드시 포함**해야 패키지 안에서 쓴 클래스가 빌드에 포함된다.

---

## 4. `packages/ui-web` — shadcn 기반 웹 컴포넌트

- `apps/web`에서 `npx shadcn@latest init` 실행 후, 컴포넌트 생성 위치를 `packages/ui-web/src`로 지정 (shadcn 모노레포 공식 가이드 방식 — `components.json`의 aliases 조정)
- **shadcn CSS 변수 채우기**: `apps/web/src/styles/globals.css`의 `:root`에 있는 `--background`, `--primary` 등의 값을 `design-tokens`의 `semantic` 값과 일치시킨다. 파일 상단에 다음 주석을 필수로 남긴다:
  `/* SOURCE OF TRUTH: packages/design-tokens/src/colors.ts — 수정 시 양쪽 동기화 */`

### Button 레퍼런스 구현 (참고 프로젝트의 variant 함수 → CVA로 치환)

```tsx
// packages/ui-web/src/button.tsx
import { cva } from "class-variance-authority";
import type { ButtonBaseProps } from "@my/design-tokens";
import { cn } from "./lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-full transition-colors disabled:pointer-events-none",
  {
    variants: {
      size: {
        large: "h-[62px] w-[343px] text-title2-bold", // 치수는 Figma 컴포넌트에서 추출
        medium: "h-[42px] w-[151px] text-title3-bold",
        small: "h-[42px] w-[90px] text-title4-bold",
      },
      color: {
        primary:
          "bg-primary text-primary-foreground active:bg-gray100 disabled:bg-gray800 disabled:text-gray600",
        secondary:
          "bg-gray800 text-white active:bg-gray700 disabled:text-gray600",
        outline:
          "border border-gray400 bg-transparent text-foreground active:bg-gray200",
      },
    },
    defaultVariants: { size: "large", color: "primary" },
  },
);

interface ButtonProps
  extends
    ButtonBaseProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  text: string;
}

export const Button = ({
  text,
  size,
  color,
  className,
  ...props
}: ButtonProps) => (
  <button className={cn(buttonVariants({ size, color }), className)} {...props}>
    {text}
  </button>
);
```

---

## 5. `packages/ui-native` — NativeWind 기반 RN 컴포넌트

같은 `ButtonBaseProps`를 import해서 **웹과 동일한 API**를 강제한다.

```tsx
// packages/ui-native/src/Button.tsx
import { Pressable, Text } from "react-native";
import type { ButtonBaseProps } from "@my/design-tokens";

const sizeClass = {
  large: "h-[62px] w-[343px]",
  medium: "h-[42px] w-[151px]",
  small: "h-[42px] w-[90px]",
} as const;

const textSizeClass = {
  large: "text-title2-bold font-[Pretendard-Bold]",
  medium: "text-title3-bold font-[Pretendard-Bold]",
  small: "text-title4-bold font-[Pretendard-Bold]",
} as const;

const colorClass = {
  primary: {
    bg: "bg-primary active:bg-gray100",
    bgDisabled: "bg-gray800",
    text: "text-primary-foreground",
    textDisabled: "text-gray600",
  },
  secondary: {
    bg: "bg-gray800 active:bg-gray700",
    bgDisabled: "bg-gray800",
    text: "text-white",
    textDisabled: "text-gray600",
  },
  outline: {
    bg: "bg-transparent border border-gray400 active:bg-gray200",
    bgDisabled: "border-gray700",
    text: "text-foreground",
    textDisabled: "text-gray600",
  },
} as const;

interface ButtonProps extends ButtonBaseProps {
  text: string;
  onPress?: () => void;
}

export const Button = ({
  text,
  size = "large",
  color = "primary",
  disabled,
  onPress,
}: ButtonProps) => {
  const c = colorClass[color];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`items-center justify-center rounded-full ${sizeClass[size]} ${disabled ? c.bgDisabled : c.bg}`}
    >
      <Text
        className={`${textSizeClass[size]} ${disabled ? c.textDisabled : c.text}`}
      >
        {text}
      </Text>
    </Pressable>
  );
};
```

- 프레스 애니메이션 등 인터랙션 훅은 `ui-native/src/hooks/`에 둔다 (RN 전용이므로).

---

## 6. 반드시 지킬 규칙 (6개조)

1. **색상·크기·타이포 값의 유일한 출처는 `design-tokens`.** 컴포넌트/앱 코드에 hex, px 리터럴 금지. Tailwind 임의값(`bg-[#fff]`) 금지 — 단, 컴포넌트 고유 치수(버튼 62px 등)는 variant 정의 안에서만 허용.
2. **원시 토큰(grayscale)보다 시맨틱 토큰(primary, background 등) 우선 사용.** 시맨틱으로 표현 안 되는 경우에만 grayscale 직접 사용.
3. **`ui-web`/`ui-native`에는 도메인 무관 컴포넌트만.** API 호출·비즈니스 로직이 필요하면 각 앱의 `features/`로.
4. **variant API는 `design-tokens/src/variants.ts`의 공용 타입에서 시작.** 웹/앱 컴포넌트가 같은 union 타입을 import한다. 한쪽에만 variant를 추가하지 않는다.
5. **shadcn CSS 변수(`globals.css`)를 수정할 때는 반드시 `design-tokens`를 먼저 수정하고 동기화.**
6. **새 공통 컴포넌트는 웹·앱 각각 Storybook 스토리(또는 최소 JSDoc `@example`)와 함께 추가.**

---

## 7. Figma 연동 워크플로우

### 7-1. 토큰 추출 (프로젝트 초기 1회)

사용자가 Figma 파일 URL을 제공하면:

1. Figma MCP 도구(`get_variable_defs`, `get_design_context` 등)로 **Variables(색상)와 Text Styles(타이포)** 를 읽는다.
2. 읽은 값으로 `design-tokens`의 `colors.ts`, `typography.ts`를 채운다. **값을 임의로 만들지 말고 Figma에 정의된 값만 사용한다.**
3. spacing/radius는 컴포넌트 프레임에서 반복되는 값을 추출해 스케일로 정리한다.
4. Figma 스타일명과 코드 토큰명이 다르면 사용자에게 매핑을 확인받는다.

**Figma 쪽 전제 조건 (사용자에게 체크 요청)**:

- 색상이 개별 hex가 아니라 **Figma Variables 또는 Color Styles로 등록**되어 있을 것 — 이름은 토큰명과 동일하게 (`gray500`, `primary`, `background`)
- 타이포가 **Text Styles로 등록**되어 있을 것 — 이름을 `h1`, `title1-bold`처럼 코드 토큰명과 1:1로
- Figma가 정리 안 되어 있으면: 디자인에서 실제 사용된 색을 수집해 팔레트 후보로 정리한 뒤 사용자와 함께 토큰명을 확정한다.

### 7-2. 컴포넌트/화면 구현 (반복 작업)

사용자가 Figma 노드 URL을 주면:

1. `get_design_context`로 해당 노드를 읽는다.
2. **기존 공통 컴포넌트가 있으면 새로 만들지 않고 `@my/ui-web`/`@my/ui-native`에서 재사용한다.**
3. 새 공통 컴포넌트라면: Figma 컴포넌트의 variant 속성(Size=Large/Medium/Small 등)을 그대로 CVA/클래스맵 variant로 옮기고, `variants.ts`에 공용 타입을 추가한다.
4. 스타일 값은 design-tokens 기반 Tailwind 클래스만 사용한다 (규칙 1).
5. 구현 후 Figma 스크린샷과 실제 렌더링을 비교 검증한다.

### 7-3. (선택) Code Connect

컴포넌트가 10개쯤 쌓이면 Figma Code Connect로 "Figma 컴포넌트 ↔ 코드 파일" 매핑을 등록해, 이후 화면 구현 시 기존 컴포넌트가 자동 재사용되게 한다.

---

## 8. 문서화

세팅 완료 후 다음 두 문서를 작성한다:

- `docs/DESIGN_SYSTEM.md`: 규칙 6개조 + 토큰 사용법 (색상/타이포/스페이싱 클래스 목록) + 컴포넌트 추가 절차
- `docs/FIGMA_WORKFLOW.md`: 위 [7]번 내용을 팀 가이드로 정리

---

## 9. 참고: 원본 레퍼런스 프로젝트와의 대응

이 스펙은 pico-world(React Native + styled-components, FSD 구조) 프로젝트의 디자인 시스템을 모노레포/멀티플랫폼용으로 재설계한 것이다.

| pico-world (원본)                                               | 새 모노레포                                             |
| --------------------------------------------------------------- | ------------------------------------------------------- |
| `shared/config/theme/` (Colors, typography, theme, styled.d.ts) | `packages/design-tokens/` + `packages/tailwind-preset/` |
| `shared/ui/` + `shared/style/*.styles.ts`                       | `packages/ui-web/` + `packages/ui-native/`              |
| variant 계산 함수 (`getBgColor`, `getSize`)                     | 웹: CVA variants / 앱: 클래스맵 객체                    |
| styled-components `css` 타이포 조각                             | 순수 데이터 토큰 → Tailwind `fontSize` 항목             |
| `rem()` 반응형 함수                                             | 웹: 표준 rem / 앱: 필요 시 ui-native 내부 어댑터        |
| `app/`, `features/`, `entities/`, `widgets/`                    | 각 앱 내부에 동일한 FSD 레이어                          |
| `docs/THEME_GUIDE.md`                                           | `docs/DESIGN_SYSTEM.md` + `FIGMA_WORKFLOW.md`           |

---

## 10. 확정된 설정 (사용자 확인 완료)

아래 값은 이미 확정되었다. 사용자에게 다시 질문하지 말고 이 값으로 진행한다.

1. **Figma 파일 (토큰 추출용)**: https://www.figma.com/design/CpqOlgayviFOG0WXTBUfpp/Fill-Map?node-id=13402-687&t=407jtfTLqbwB9Hxv-4
   - 색상 변수와 텍스트 스타일이 정의되어 있다. MCP로 읽어서 `design-tokens`를 채운다.
     **값을 임의로 만들지 말고 Figma에 정의된 값만 사용한다.**
2. **웹 프레임워크**: React + Vite
3. **패키지 스코프명**: `@fillmap/*`
4. **폰트**: Inter — 이 문서의 Pretendard 예시는 참고용이므로 fontFamily 관련 코드는
   전부 Inter 기준으로 작성한다. 웹은 `font-family: Inter` + `font-weight`로 처리하고,
   굵기 스케일은 Figma 텍스트 스타일에 정의된 대로 따른다.
   (RN용 굵기별 폰트 파일 매핑은 모바일 앱 추가 시점에 처리)
5. **기존 세팅**: `apps/web`에 초기 라이브러리가 설치된 상태다. 기존 세팅(설치된
   라이브러리, Tailwind 버전, 폴더 구조)을 먼저 확인하고 거기에 맞춰 진행한다.
   `apps/mobile`은 아직 없으며 나중에 추가한다 — **이번 작업 범위는
   `packages/`(design-tokens, tailwind-preset, ui-web)와 `apps/web` 연결까지.
   `ui-native`는 이번에는 만들지 않는다** (문서의 [5]번 섹션은 추후 참고용).

## 11. 적용 순서

1. [10]번 확정 설정을 숙지하고, 기존 `apps/web` 세팅을 확인
2. 루트 pnpm workspace 구성 확인/보완 → `packages/*` 스캐폴딩 (`apps/mobile`, `ui-native`는 이번 범위 제외)
3. Figma에서 토큰 추출 → `design-tokens` 작성 ([7-1])
   → **추출된 토큰 목록(색상/타이포 이름과 값)을 사용자에게 보여주고 확인받은 뒤 다음 단계로 진행**
4. `tailwind-preset` 작성 → `apps/web` tailwind config에 연결 → `bg-gray500`, `text-h1` 같은 클래스 동작 확인
5. shadcn init → `globals.css` CSS 변수를 토큰 값으로 교체 → Figma의 Button을 CVA + 공용 variant 타입으로 구현
6. Button을 Figma와 비교 검증 → 이걸 레퍼런스 삼아 나머지 컴포넌트 확장
7. `docs/` 문서 2종 작성 ([8])
8. (추후) `apps/mobile` 추가 시: Expo + NativeWind 세팅 → 같은 preset 연결 → `ui-native` 구현 → Inter 굵기별 폰트 파일 로드
