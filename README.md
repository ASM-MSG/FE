# FillMap FE

필맵(FillMap) 프론트엔드 모노레포입니다. 웹(React 19 + Vite)과 디자인 시스템 패키지를 함께 관리하며, React Native 앱으로 확장을 고려한 구조입니다.

## 프로젝트 구조

pnpm workspace 기반 모노레포입니다.

| 경로 | 패키지 | 설명 |
|------|--------|------|
| `apps/web` | web | React 19 + Vite 웹 애플리케이션 (FSD 구조) |
| `packages/design-tokens` | @fillmap/design-tokens | 색상·타이포·간격 등 디자인 토큰 |
| `packages/tailwind-preset` | @fillmap/tailwind-preset | 토큰을 반영한 Tailwind 프리셋 |
| `packages/ui-web` | @fillmap/ui-web | 공통 UI 컴포넌트 (Storybook 포함) |

## 시작하기

pnpm `10.17.1` 기준입니다.

```bash
pnpm install        # 의존성 설치
pnpm dev            # 웹 개발 서버 실행
pnpm build          # 웹 프로덕션 빌드
pnpm lint           # 린트 검사
pnpm storybook      # ui-web 스토리북 실행
```

## 문서

| 문서 | 내용 |
|------|------|
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | 디자인 시스템 규칙 (6개조) |
| [DESIGN_SYSTEM_SPEC.md](DESIGN_SYSTEM_SPEC.md) | 디자인 시스템 구조 스펙 |
| [docs/FIGMA_WORKFLOW.md](docs/FIGMA_WORKFLOW.md) | 피그마 연동 워크플로 |
| [docs/TICKET_TEMPLATE.md](docs/TICKET_TEMPLATE.md) | 지라 티켓 작성 템플릿 |
| [docs/decisions](docs/decisions) | 의사결정 기록 (ADR) |

## 브랜치 전략

Git Flow를 기반으로 하되, `main`(배포) / `develop`(기본 브랜치) / 작업 브랜치 3계층으로 운영합니다. 작업 브랜치는 `develop`에서 분기하고 PR도 `develop`으로 보냅니다.

### 브랜치 네이밍 컨벤션

| 유형 | 형식 | 예시 |
|------|------|------|
| 기능 추가 | `feat/MSG-<번호>-<기능명>` | `feat/MSG-118-ai-highlight-recommendation-ui` |
| 버그 수정 | `fix/MSG-<번호>-<기능명>` | `fix/MSG-134-login-redirect` |
| 긴급 패치 | `hotfix/MSG-<번호>-<기능명>` | `hotfix/MSG-188-navbar-crash` |

- 기능명에는 kebab-case 사용
- 번호는 지라 이슈 키(MSG-xxx)와 연동
- 브랜치 유형은 티켓의 주 목적 기준으로 3종만 사용합니다. 리팩토링·설정성 작업은 별도 브랜치 유형 없이 `feat/`로 진행하고, 커밋 prefix(`refactor`, `chore`, `setting`)로 구분합니다.

## 커밋 컨벤션

[Udacity Git Style Guide](https://udacity.github.io/git-styleguide/) 기반이며, 앞에 지라 이슈 키를 붙입니다.

```
<지라키> <prefix>: <제목>
```

| prefix | 설명 |
|--------|------|
| `feat` | 새로운 기능 추가 |
| `fix` | 버그 수정 (`hotfix/` 브랜치의 커밋도 `fix` 사용) |
| `docs` | 문서 수정 (README 등) |
| `style` | UI/스타일 변경 (기능 변경 없음) |
| `refactor` | 기능 변경 없이 코드 리팩토링 |
| `test` | 테스트 코드 추가, 변경 |
| `chore` | 빌드, 패키지, 결정 기록 등 작업 (프로덕션 코드 영향 없음) |
| `setting` | 개발 환경·설정 파일 구성 (tsconfig, CI, 훅 등) |

이 목록은 `.husky/commit-msg` 훅이 강제하는 목록과 1:1로 일치한다. prefix를 추가/삭제할 때는 이 표와 훅을 함께 수정한다.

```
MSG-118 feat: AI 하이라이트 자동 추천 구간 선택 UI 구현
MSG-116 fix: 신고 제출 중복 클릭 방지
MSG-116 chore: danger 버튼 대비율 이슈 결정 기록
MSG-120 docs: README에 브랜치 전략 설명 추가
```

## 코드 컨벤션

### 파일 및 폴더명

- 폴더, 훅·스토어·유틸 등 로직 파일: **kebab-case** (`cell-viewport.ts`, `use-map-shell.ts`)
- React 컴포넌트 파일: **PascalCase** (`MapHomePage.tsx`, `SearchBox.tsx`)

### 코드 스니펫

| 항목 | 스니펫 | 설명 |
|------|--------|------|
| UI 컴포넌트 | `rfc` | 함수형 컴포넌트 |
| 유틸리티 함수 | `rafc` | 화살표 함수 형태의 유틸 함수 정의 |

### 변수 및 함수

- 변수 네이밍: **camelCase**, Boolean 값은 `is` 접두사 사용 (`isActive`)
- 상수: **대문자 스네이크 케이스** (`API_BASE_URL`)
- 이벤트 핸들러: 화살표 함수, `handle + 명사 + 동사` 네이밍 (`handleUserClick`)

### 타입 정의

- 객체 타입: `interface`
- enum 대용, 간단한 타입: `type`
- 타입명: **PascalCase** (`UserInfo`, `ButtonVariant`)

### 스타일

- Tailwind + 디자인 토큰 사용 — 임의 색상·수치 하드코딩 대신 토큰 사용 ([docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) 준수)
- 컴포넌트 고유 치수는 Tailwind 숫자 스케일 클래스(rem 기반, 사용자 폰트 설정 추종) 사용 — px 임의값(`w-[40px]`)은 eslint가 금지. 시맨틱 토큰(`p-md` 등)은 px 고정
