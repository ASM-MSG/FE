import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // src/shared/api/generated: hey-api 생성 코드(MSG-289) — 수정 대상이 아니라 lint 제외 (typecheck·build에는 포함)
  globalIgnores(['dist', 'src/shared/api/generated']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      'better-tailwindcss': betterTailwindcss,
    },
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // 디자인 시스템 1조(docs/DESIGN_SYSTEM.md) 기계 강제 — packages/ui-web과 동일 패턴 유지
      'better-tailwindcss/no-restricted-classes': [
        'error',
        {
          restrict: [
            {
              pattern:
                '^(?:.*:)?-?(?:p[xytblrse]?|m[xytblrse]?|w|h|size|gap(?:-[xy])?|min-w|max-w|min-h|max-h|space-[xy]|translate(?:-[xy])?|top|bottom|left|right|inset(?:-[xy])?|indent)-\\[\\d+px\\]$',
              message:
                'px 임의값 금지 — 정수 px는 스케일 클래스로 전부 표현됩니다 (예: w-[40px]→w-10, 6px→1.5, 1px→px). docs/DESIGN_SYSTEM.md 1조',
            },
            {
              pattern: '\\[(?:#|rgba?\\(|hsla?\\(|oklch\\()',
              message:
                '색상 임의값 금지 — design-tokens의 시맨틱/원시 토큰 클래스를 사용하세요. docs/DESIGN_SYSTEM.md 1조',
            },
          ],
        },
      ],
    },
  },
  {
    // RN 대비 경계 규칙(page-implementation 스킬) 기계 강제 — 로직 레이어는 플랫폼 중립.
    // widgets/pages의 뷰-레이어 훅(라우터 연결용)은 이 glob에 안 걸리므로 예외가 자동 성립한다.
    files: [
      'src/features/*/model/**',
      'src/entities/*/model/**',
      'src/widgets/**/*-store.*',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react-router*'],
              message:
                'model 레이어는 라우터를 몰라야 합니다(RN 재사용 대상). 네비게이션은 콜백 주입 또는 뷰-레이어 훅에서 처리하세요.',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        {
          name: 'window',
          message:
            'model 레이어에서 window 직접 접근 금지 — shared/ 어댑터를 경유하세요 (RN 경계 규칙)',
        },
        {
          name: 'document',
          message:
            'model 레이어에서 document 직접 접근 금지 — shared/ 어댑터를 경유하세요 (RN 경계 규칙)',
        },
        {
          name: 'localStorage',
          message:
            'localStorage 직접 접근 금지 — shared/의 storage 어댑터를 사용하세요 (RN 경계 규칙)',
        },
      ],
    },
  },
])
