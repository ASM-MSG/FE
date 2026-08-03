/**
 * Expo 모노레포(pnpm) + NativeWind + on-device Storybook 연결.
 * - watchFolders: 워크스페이스 패키지(ui-native 등) 변경 감지
 * - nodeModulesPaths: pnpm 루트 node_modules까지 해석 경로 확장
 * - inlineRem 16: 웹 rem 기준(16px)과 동일하게 고정 (NativeWind 기본 14 → 스케일 불일치 방지)
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

module.exports = withStorybook(
  withNativeWind(config, { input: "./src/global.css", inlineRem: 16 }),
  {
    // EXPO_PUBLIC_STORYBOOK=1 이면 Storybook UI로 진입한다 (스펙 A4)
    enabled: process.env.EXPO_PUBLIC_STORYBOOK === "1",
    configPath: path.resolve(projectRoot, ".rnstorybook"),
    onDisabledRemoveStorybook: true,
  },
);
