/**
 * fillmap/no-restricted-classes — oxlint JS 플러그인 (MSG-386)
 *
 * eslint-plugin-better-tailwindcss/no-restricted-classes 상당 규칙.
 * 디자인 시스템 1조(docs/DESIGN_SYSTEM.md) 기계 강제: px 임의값·색상 임의값 금지.
 *
 * 검사 컨텍스트 (원본 플러그인의 기본 selector와 동일 범위):
 * - JSX 속성 class/className (리터럴·템플릿·조건식·논리식)
 * - 클래스 유틸 callee 호출 인자 (cn·cva·clsx 등 원본 기본 목록)
 * - 클래스성 변수명(className·classNames·classes·style·styles) 초기화 값
 *
 * NOTE: oxlint JS 플러그인(jsPlugins)은 alpha API — oxlint 업그레이드 시
 * `pnpm lint`로 동작을 재확인할 것.
 */

const RESTRICTIONS = [
  {
    // 스페이싱·사이징 계열의 정수 px 임의값 — 스케일 클래스로 전부 표현 가능
    pattern:
      /^(?:.*:)?-?(?:p[xytblrse]?|m[xytblrse]?|w|h|size|gap(?:-[xy])?|min-w|max-w|min-h|max-h|space-[xy]|translate(?:-[xy])?|top|bottom|left|right|inset(?:-[xy])?|indent)-\[\d+px\]$/,
    message:
      "px 임의값 금지 — 정수 px는 스케일 클래스로 전부 표현됩니다 (예: w-[40px]→w-10, 6px→1.5, 1px→px). docs/DESIGN_SYSTEM.md 1조",
  },
  {
    // hex·rgb(a)·hsl(a)·oklch 색상 임의값
    pattern: /\[(?:#|rgba?\(|hsla?\(|oklch\()/,
    message:
      "색상 임의값 금지 — design-tokens의 시맨틱/원시 토큰 클래스를 사용하세요. docs/DESIGN_SYSTEM.md 1조",
  },
]

// eslint-plugin-better-tailwindcss 기본 callee 목록과 동일
const CALLEES = new Set([
  "cc",
  "clb",
  "clsx",
  "cn",
  "cnb",
  "ctl",
  "cva",
  "cx",
  "dcnb",
  "objstr",
  "tv",
  "twJoin",
  "twMerge",
])

// 원본 플러그인 기본 variable selector: ^classNames?$ · ^classes$ · ^styles?$
const VARIABLE_NAME = /^(?:classNames?|classes|styles?)$/
const ATTRIBUTE_NAME = /^class(?:Name)?$/

/** 표현식 서브트리에서 클래스 문자열(리터럴·템플릿 quasi)을 수집한다 */
function collectStrings(node, out) {
  if (!node || typeof node !== "object") return
  switch (node.type) {
    case "Literal":
      if (typeof node.value === "string") out.push({ node, value: node.value })
      break
    case "TemplateLiteral":
      for (const quasi of node.quasis) {
        out.push({ node: quasi, value: quasi.value.cooked ?? quasi.value.raw })
      }
      break
    case "JSXExpressionContainer":
      collectStrings(node.expression, out)
      break
    case "ConditionalExpression":
      collectStrings(node.consequent, out)
      collectStrings(node.alternate, out)
      break
    case "LogicalExpression":
      collectStrings(node.left, out)
      collectStrings(node.right, out)
      break
    case "ArrayExpression":
      for (const element of node.elements) collectStrings(element, out)
      break
    case "ObjectExpression":
      // cva variants 등 — 문자열 키·값 모두 수집(제한 패턴은 임의값 클래스에만
      // 매칭되므로 variant 이름 키가 걸릴 일은 없다)
      for (const property of node.properties) {
        if (property.type === "Property") {
          if (property.key?.type === "Literal") {
            collectStrings(property.key, out)
          }
          collectStrings(property.value, out)
        } else if (property.type === "SpreadElement") {
          collectStrings(property.argument, out)
        }
      }
      break
    case "SpreadElement":
      collectStrings(node.argument, out)
      break
  }
}

function checkStrings(context, strings) {
  for (const { node, value } of strings) {
    for (const className of value.split(/\s+/)) {
      if (className.length === 0) continue
      for (const { pattern, message } of RESTRICTIONS) {
        if (pattern.test(className)) {
          context.report({ node, message: `"${className}": ${message}` })
        }
      }
    }
  }
}

const noRestrictedClasses = {
  meta: {
    docs: {
      description:
        "디자인 시스템 1조 — 금지된 Tailwind 클래스 패턴(px·색상 임의값)을 검출한다",
      url: "docs/DESIGN_SYSTEM.md",
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (
          node.name.type === "JSXIdentifier" &&
          ATTRIBUTE_NAME.test(node.name.name)
        ) {
          const strings = []
          collectStrings(node.value, strings)
          checkStrings(context, strings)
        }
      },
      CallExpression(node) {
        if (
          node.callee.type === "Identifier" &&
          CALLEES.has(node.callee.name)
        ) {
          const strings = []
          for (const argument of node.arguments) {
            collectStrings(argument, strings)
          }
          checkStrings(context, strings)
        }
      },
      VariableDeclarator(node) {
        if (
          node.id.type === "Identifier" &&
          VARIABLE_NAME.test(node.id.name) &&
          node.init
        ) {
          const strings = []
          collectStrings(node.init, strings)
          checkStrings(context, strings)
        }
      },
    }
  },
}

export default {
  meta: { name: "fillmap" },
  rules: { "no-restricted-classes": noRestrictedClasses },
}
