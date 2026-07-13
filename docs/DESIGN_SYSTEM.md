# FillMap 디자인 시스템 가이드

> 토큰 원본: Figma [FeelMap Design Tokens](https://www.figma.com/design/CpqOlgayviFOG0WXTBUfpp/Fill-Map?node-id=13402-687) (node `13402:687`)
> 코드 유일 출처: `packages/design-tokens/src/*`

## 패키지 구조와 의존 방향

```
apps/web        →  @fillmap/ui-web        →  @fillmap/design-tokens
apps/web (tailwind.config.ts)  →  @fillmap/tailwind-preset  →  @fillmap/design-tokens
```

- `packages/design-tokens` — 순수 상수만. react 등 UI 라이브러리 import 금지
- `packages/tailwind-preset` — 토큰 → Tailwind theme 변환 (웹/추후 NativeWind 공용)
- `packages/ui-web` — shadcn/CVA 기반 도메인 무관 공통 컴포넌트
- `apps/web/src/styles/globals.css` — shadcn CSS 변수 (토큰과 1:1 동기화, 파일 상단 주석 참고)

**소속 판단 기준**
- 웹과 앱(추후) 둘 다 쓰는가? → `packages/`
- 도메인(비즈니스)을 아는가? → 무조건 `apps/*/features|entities`
- 한 앱에서만 쓰는 훅/유틸인가? → 그 앱의 `shared/`
- ⚠️ `apps/*/shared`에 재사용 UI 컴포넌트 금지. 재사용 컴포넌트가 필요해지면 `packages/ui-*`로 갈 신호다.

## 반드시 지킬 규칙 (6개조)

1. **색상·크기·타이포 값의 유일한 출처는 `design-tokens`.** 컴포넌트/앱 코드에 hex, px 리터럴 금지. Tailwind 임의값(`bg-[#fff]`) 금지 — 단, 컴포넌트 고유 치수(`min-w-[60px]` 등)는 variant 정의 안에서만 허용.
2. **원시 토큰(`blue-500` 등)보다 시맨틱 토큰(`primary`, `background` 등) 우선 사용.** 시맨틱으로 표현 안 되는 경우에만 원시 토큰 직접 사용.
3. **`ui-web`(추후 `ui-native`)에는 도메인 무관 컴포넌트만.** API 호출·비즈니스 로직은 각 앱의 `features/`로.
4. **variant API는 `design-tokens/src/variants.ts`의 공용 타입에서 시작.** 웹/앱 컴포넌트가 같은 union 타입을 import한다. 한쪽에만 variant를 추가하지 않는다.
5. **shadcn CSS 변수(`globals.css`)를 수정할 때는 반드시 `design-tokens`를 먼저 수정하고 동기화.**
6. **새 공통 컴포넌트는 Storybook 스토리(또는 최소 JSDoc `@example`)와 함께 추가.**

## 색상 클래스

### 시맨틱 (우선 사용)

| Figma 이름 | 값 | Tailwind 클래스 |
|---|---|---|
| color/primary | `#0066CC` | `bg-primary` `text-primary` (+ `text-primary-foreground`) |
| color/secondary | `#0071E3` | `bg-secondary` (+ `text-secondary-foreground`) |
| color/success | `#22C55E` | `bg-success` `text-success` |
| color/accent | `#2997FF` | `bg-accent` (+ `text-accent-foreground`) |
| color/highlight | `#2997FF` | `bg-highlight` |
| color/text-primary | `#1D1D1F` | `text-foreground` |
| color/body | `#333333` | `text-foreground-body` |
| color/muted | `#7A7A7A` | `text-muted-foreground`, `text-foreground-muted` |
| color/text-inverse | `#FFFFFF` | `text-foreground-inverse` |
| color/canvas | `#FFFFFF` | `bg-background`, `bg-canvas` |
| color/surface | `#F5F5F7` | `bg-surface`, `bg-muted` |
| color/surface-soft | `#FAFAFC` | `bg-surface-soft` |
| color/surface-elevated | `#FFFFFF` | `bg-surface-elevated` |
| color/on-primary | `#FFFFFF` | `text-primary-foreground` |
| color/icon-default | `#1D1D1F` | `text-icon` |
| color/border | `#E0E0E0` | `border-border` (기본), `bg-border` |
| color/hairline-strong | `#D2D2D7` | `border-hairline-strong` |
| color/warning | `#F59E0B` | `bg-warning` `text-warning` |
| color/error | `#EF4444` | `bg-error` `text-error`, `bg-destructive` (shadcn 호환) |

### 원시 (시맨틱으로 표현 안 될 때만)

`blue-500` `cyan-500` `violet-500` `mint-500` `green-500` `amber-500` `red-500` `navy-900` `slate-600` `slate-400` `slate-300` `gray-200` `gray-100` `surface-soft` `white`
→ `bg-navy-900`, `text-slate-400` 형태로 사용.

## 타이포그래피 클래스

클래스 하나가 size + line-height + letter-spacing + weight를 모두 지정한다.
`fm-` prefix는 Tailwind 기본 클래스(`text-base`)·색상 클래스와의 충돌 방지용.

| 클래스 | weight / size / line-height | 용도 (Figma Text Style) |
|---|---|---|
| `text-fm-display` | 600 / 20 / 26 | 모달 타이틀 (FeelMap/Display) |
| `text-fm-heading` | 500 / 16 / 20 | 화면 헤더 (FeelMap/Heading) |
| `text-fm-title` | 600 / 15 / 19 | 시트 타이틀 (FeelMap/Title) |
| `text-fm-base` | 400 / 14 / 20 | 본문/입력 (FeelMap/Base) |
| `text-fm-body-strong` | 600 / 13 / 17 | 카드 제목 (FeelMap/Body Strong) |
| `text-fm-body` | 400 / 13 / 18 | 본문 보조 (FeelMap/Body) |
| `text-fm-label` | 500 / 12 / 15 | 라벨/버튼 보조 (FeelMap/Label) |
| `text-fm-caption` | 400 / 11 / 14 | 캡션/메타 (FeelMap/Caption) |

폰트는 Inter (`@fontsource-variable/inter`, `--font-sans`).

## Spacing / Radius / Shadow

| Spacing | px | | Radius | px | | Shadow | 용도 |
|---|---|---|---|---|---|---|---|
| `p-xxs` | 4 | | `rounded-none` | 0 | | `shadow-raised` | 카드 |
| `p-xs` | 8 | | `rounded-xs` | 4 | | `shadow-sheet` | 바텀시트 |
| `p-sm` | 12 | | `rounded-sm` | 8 | | `shadow-fab` | FAB |
| `p-md` | 16 | | `rounded-md` | 12 | | `shadow-toast` | 토스트 |
| `p-lg` | 24 | | `rounded-lg` | 16 | | `shadow-modal` | 모달 |
| `p-xl` | 32 | | `rounded-xl` | 24 | | | |
| `p-xxl` | 48 | | `rounded-full` | 9999 | | | |
| `p-section` | 64 | | | | | | |

spacing은 `p-*` 외에 `m-*`, `gap-*`, `px-*` 등 모든 spacing 계열 유틸에서 동일하게 동작한다.
Tailwind 기본 숫자 스케일(`p-4` = 16px)도 함께 유지된다.

## 컴포넌트 추가 절차

1. Figma 노드 확인 — 기존 `@fillmap/ui-web` 컴포넌트로 조립 가능하면 새로 만들지 않는다.
2. `design-tokens/src/variants.ts`에 `XxxBaseProps` 추가 (Figma 컴포넌트의 Variant 속성과 1:1).
3. `packages/ui-web/src/xxx.tsx`에 CVA로 구현 — 스타일 값은 토큰 기반 클래스만 사용 (규칙 1).
4. `packages/ui-web/src/index.ts` 배럴에 export 추가.
5. JSDoc `@example` 작성 (규칙 6), 데모/스토리에서 Figma와 비교 검증.
6. (추후 `ui-native` 도입 시) 같은 `XxxBaseProps`로 RN 구현을 추가한다.

자세한 Figma 연동 절차는 [FIGMA_WORKFLOW.md](./FIGMA_WORKFLOW.md) 참고.
