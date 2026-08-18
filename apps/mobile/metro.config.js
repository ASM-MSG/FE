/**
 * Expo 모노레포(pnpm) + NativeWind + on-device Storybook 연결.
 * - watchFolders: 워크스페이스 패키지(ui-native 등) 변경 감지
 * - nodeModulesPaths: pnpm 루트 node_modules까지 해석 경로 확장
 * - inlineRem 16: 웹 rem 기준(16px)과 동일하게 고정 (NativeWind 기본 14 → 스케일 불일치 방지)
 * - resolveRequest: 웹 생성 SDK의 client-config 해석을 모바일 구현으로 치환 (MSG-419)
 */
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const {
  withStorybook,
} = require("@storybook/react-native/metro/withStorybook");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

/**
 * MSG-419 — 생성 SDK 공유의 단일 인터셉트 지점.
 * 웹 생성물 `generated/client.gen.ts`는 `'../client-config'`(웹 파일)를 정적 import한다.
 * 그대로 두면 웹 client-config → 웹 http-client → 웹 auth-pipeline → localStorage 체인이
 * 앱 번들에 딸려 온다. 그 요청만 모바일 client-config로 치환해 모바일 Ky·baseUrl을 쓴다.
 * 같은 규칙을 vitest.config.ts가 플러그인으로 재현한다(테스트와 런타임 배선 일치).
 */
const webGeneratedDir = path.resolve(
  workspaceRoot,
  "apps/web/src/shared/api/generated",
);
const mobileClientConfig = path.resolve(
  projectRoot,
  "src/shared/api/client-config.ts",
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    moduleName === "../client-config" &&
    context.originModulePath.startsWith(webGeneratedDir)
  ) {
    return { type: "sourceFile", filePath: mobileClientConfig };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withStorybook(
  withNativeWind(config, { input: "./src/global.css", inlineRem: 16 }),
  {
    // EXPO_PUBLIC_STORYBOOK=1 이면 Storybook UI로 진입한다 (스펙 A4)
    enabled: process.env.EXPO_PUBLIC_STORYBOOK === "1",
    configPath: path.resolve(projectRoot, ".rnstorybook"),
    onDisabledRemoveStorybook: true,
  },
);
