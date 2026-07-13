# Figma → 코드 워크플로우

> 디자인 원본: [Fill-Map Figma](https://www.figma.com/design/CpqOlgayviFOG0WXTBUfpp/Fill-Map)
> 토큰 스펙 시트: node `13402:687` (FeelMap Design Tokens 프레임)

## 1. 토큰 추출 (프로젝트 초기 1회 — 완료됨)

Figma MCP 도구로 Variables(색상/spacing/radius)와 Text Styles(타이포)를 읽어
`packages/design-tokens`를 채웠다. **값을 임의로 만들지 말고 Figma에 정의된 값만 사용한다.**

토큰이 바뀌면 같은 절차로 재추출한다:

1. `get_variable_defs` (node `13402:687`)로 변수/스타일 값을 읽는다.
2. `design-tokens`의 해당 파일(`colors.ts`, `typography.ts`, `spacing.ts`, `radius.ts`, `shadows.ts`)을 갱신한다.
3. `apps/web/src/styles/globals.css`의 `:root` CSS 변수를 같은 값으로 동기화한다 (규칙 5).
4. Figma 스타일명과 코드 토큰명이 다르면 팀에 매핑을 확인받는다.

**Figma 쪽 전제 조건**
- 색상은 개별 hex가 아니라 Figma Variables(FeelMap Primitives / FeelMap Color)로 등록
- 타이포는 Text Styles(`FeelMap/*`)로 등록 — 이름은 코드 토큰명과 1:1
- spacing/radius도 변수 컬렉션(FeelMap Spacing / FeelMap Radius)으로 관리

## 2. 컴포넌트/화면 구현 (반복 작업)

Figma 노드 URL을 받으면:

1. `get_design_context`로 해당 노드를 읽는다.
2. **기존 공통 컴포넌트가 있으면 새로 만들지 않고 `@fillmap/ui-web`에서 재사용한다.**
3. 새 공통 컴포넌트라면:
   - Figma 컴포넌트의 Variant 속성을 그대로 CVA variant로 옮긴다.
   - `design-tokens/src/variants.ts`에 공용 타입(`XxxBaseProps`)을 추가한다.
4. 스타일 값은 design-tokens 기반 Tailwind 클래스만 사용한다 (규칙 1).
   컴포넌트 고유 치수(`min-w-[60px]` 등)만 variant 정의 안에서 임의값 허용.
5. 구현 후 Figma 스크린샷과 실제 렌더링을 비교 검증한다.

### 주의: 와이어프레임 색상

현재 Figma의 "필맵 웹 와이어프레임" 페이지 컴포넌트들은 placeholder 회색(`#1F2937` 등)으로
그려져 있어 토큰 팔레트와 다르다. **구조(variant, 레이아웃, spacing)는 와이어프레임을 따르되,
색상은 FeelMap 시맨틱 토큰으로 매핑한다** (Button 구현에서 확립한 방식):

| 와이어프레임 | 토큰 매핑 |
|---|---|
| 진회색 채움 (`#1F2937`) | `bg-primary` (강조 버튼) 또는 `bg-foreground` (chip 활성) |
| 흰 배경 + 진회색 테두리 | `bg-background border-foreground` |
| 연빨강 (`#FCA5A5`/`#7F1D1D`) | `bg-error/15 text-error` |
| 연회색 pill (`#F3F4F6`) | `bg-surface border-border` |
| 회색 링크 텍스트 (`#6B7280`) | `text-muted-foreground` |

## 3. 레퍼런스: Button

`packages/ui-web/src/button.tsx` — Figma Button 컴포넌트 셋(node `13021:535`)과 variant 1:1:

```tsx
import { Button } from "@fillmap/ui-web";

<Button text="저장" variant="primary" onClick={onSave} />
<Button text="전체" variant="chip-active" />
```

variant: `default` `default-active` `primary` `secondary` `danger` `chip` `chip-active`
(공용 타입: `design-tokens/src/variants.ts`의 `ButtonVariant`)

새 컴포넌트는 이 파일을 레퍼런스 삼아 확장한다.

## 4. (선택) Code Connect

공통 컴포넌트가 10개쯤 쌓이면 Figma Code Connect로 "Figma 컴포넌트 ↔ 코드 파일" 매핑을
등록해, 이후 화면 구현 시 기존 컴포넌트가 자동 재사용되게 한다.
