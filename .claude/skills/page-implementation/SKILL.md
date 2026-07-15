---
name: page-implementation
description: "FillMap 웹 페이지 구현 컨벤션 — 디렉토리 구조(FSD), 공통 컴포넌트 재사용 규칙, 디자인 토큰 규칙, RN 대비 경계 규칙, 로직 test-first 절차, ui-web 승격 절차. 페이지·화면·기능 구현, 컴포넌트 작성, 훅/스토어/폼 추가, 기존 페이지 수정 등 apps/web 코드를 작성하는 모든 작업에서 반드시 사용."
---

# Page Implementation — 페이지 구현 컨벤션

승인된 스펙(`01_spec.md`)을 코드로 옮길 때 따르는 규칙. 규칙의 원 출처는 `docs/DESIGN_SYSTEM.md`(6개조)이며, 이 스킬은 페이지 개발 관점의 실행 절차를 더한다. 충돌 시 DESIGN_SYSTEM.md가 우선한다.

## 구현 순서

수용 기준을 로직과 화면으로 나눠, **로직 먼저 test-first → 뷰 조립 → 연결** 순서로 진행한다. 뷰부터 만들면 로직이 뷰에 끌려 들어가 RN 재사용성과 테스트 가능성을 둘 다 잃는다.

### 1단계: 로직 레이어 (test-first)

대상: 훅, zustand 스토어, zod 스키마, 유틸, TanStack Query 옵션.

1. 스펙의 로직형 수용 기준을 실패하는 vitest 테스트로 옮긴다. 테스트 이름은 수용 기준 문장을 반영한다 — 테스트가 곧 기획의 번역이다
2. 테스트를 통과하는 최소 구현을 작성한다
3. 리팩토링 후 전체 테스트 재실행

테스트 실행: `pnpm --filter web test run` (watch 모드는 `run` 생략)

### 2단계: 뷰 조립

1. **인벤토리 먼저**: `packages/ui-web/src/index.ts`를 읽고 사용 가능한 컴포넌트를 확인한 뒤 시작한다
2. 페이지는 ui-web 컴포넌트 + 레이아웃(tailwind)으로 조립한다. 페이지 안에 ui-web과 역할이 겹치는 UI를 새로 만들지 않는다 — 중복 UI는 디자인 변경 시 한쪽만 고쳐지는 사고의 씨앗이다
3. 스타일 값은 토큰 클래스만 사용한다 (아래 토큰 규칙)

### 3단계: 연결 및 전체 확인

라우트 등록, 로직-뷰 연결 후 `pnpm --filter web test run`, `pnpm --filter web typecheck`, `pnpm lint` 전부 통과 확인.

## 디렉토리 구조 (FSD)

`apps/web/src/` 하위 배치 기준 (DESIGN_SYSTEM_SPEC.md의 구조를 따름):

| 위치 | 담는 것 | 예시 |
|------|--------|------|
| `app/` | 라우팅·프로바이더 | 라우터 설정, QueryClientProvider |
| `pages/` | 페이지 조립(얇은 뷰) | `pages/map/MapPage.tsx` |
| `widgets/` | 페이지 간 공유 조합 블록 | Header, BottomNav 조립체 |
| `features/` | 도메인 기능 (api + model + ui) | `features/cell-record/` |
| `entities/` | 도메인 모델·타입 | `entities/cell/` |
| `shared/` | 웹 전용 훅·유틸·어댑터 | storage 어댑터. **재사용 UI 컴포넌트 금지** |

디렉토리가 아직 없으면 이 구조대로 생성한다. 페이지 컴포넌트는 조립만 담당하는 얇은 층으로 유지하고, 상태·데이터 로직은 features/entities의 model로 내린다.

## 토큰 규칙

- 색상·크기·타이포는 토큰 클래스만: `bg-primary`, `gap-md`, `text-fm-body` 등. hex/px 리터럴과 Tailwind 임의값(`bg-[#fff]`) 금지
- 시맨틱 토큰(`primary`, `background`) 우선, 원시 토큰(`blue-500`)은 시맨틱으로 표현 불가할 때만
- 사용 가능한 토큰 클래스 목록: `docs/DESIGN_SYSTEM.md` 참조

## RN 대비 경계 규칙

로직 레이어(훅·스토어·스키마·유틸)는 추후 React Native에서 그대로 재사용할 코드다. 다음을 지키면 RN 확장이 파일 이동 수준이 되고, 어기면 전면 리팩토링이 된다:

- **웹 전용 API 직접 참조 금지**: `window`, `document`, `localStorage`를 로직에서 직접 쓰지 않는다. 필요하면 `shared/`에 어댑터(예: `storage.ts`)를 만들어 경유한다 — RN에서는 어댑터 구현만 교체
- **라우터 격리**: 훅·스토어가 `react-router`를 직접 import하지 않는다. 네비게이션이 필요한 로직은 콜백을 주입받는다
- **지도 격리**: `react-kakao-maps-sdk`는 웹 전용이다. 지도 관련 코드는 지도 컴포넌트 경계 안에만 두고, 지도 상태(중심좌표·줌 등)는 플랫폼 중립 스토어로 분리한다
- **선제적 패키지 생성 금지**: `ui-native`, `packages/core` 등을 미리 만들지 않는다. 경계만 지키면 분리는 필요해질 때 싸게 할 수 있다

## ui-web 승격 절차

페이지 작업 중 공통 UI가 필요한데 ui-web에 없을 때:

1. 스펙의 "승격 후보"에 명시된 경우에만 진행한다. 스펙에 없으면 임의로 만들지 말고 빌드 리포트에 "승격 필요"로 기록한다
2. 승격 시: `packages/design-tokens/src/variants.ts`에 `XxxBaseProps` 추가 → `packages/ui-web/src/xxx.tsx` 구현 → `xxx.stories.tsx` 스토리 작성 → `index.ts` 배럴 익스포트. 기존 컴포넌트(chip.tsx 등)의 스타일을 따른다: JSDoc에 Figma SOURCE 주석 + `@example`
3. 도메인 지식(비즈니스 용어, API 타입)이 필요한 컴포넌트는 승격 대상이 아니다 — features에 남긴다

## 결정 기록

구현 중 트레이드오프 판단(라이브러리 선택, 구조 결정, 스펙 해석)이 있었거나 테스트가 실제 버그를 잡았으면, `docs/decisions/DECISIONS.md`에 한 줄 추가한다. 형식은 해당 파일 상단 참조. 이 기록은 이후 같은 판단의 반복을 막고, 프로젝트 의사결정의 근거를 남긴다.

## 완료 조건

- 로직형 수용 기준마다 대응하는 테스트가 존재하고 통과
- `pnpm --filter web test run`, `pnpm --filter web typecheck`, `pnpm lint` 모두 통과
- `_workspace/MSG-{번호}/02_build_report.md` 작성: 변경 파일 목록, 기준별 테스트 매핑, 스펙 이슈, 결정 기록 여부
