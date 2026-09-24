/**
 * Xcode "Bundle React Native code and images" 스크립트가 node를 직접 실행해 pnpm bin shim의
 * NODE_PATH 주입을 못 받는다 → Release 번들에서 Babel이 `@babel/plugin-transform-react-jsx` 등
 * 전이 의존성을 못 찾아 아카이브가 실패한다(2026-09-24 첫 앱스토어 아카이브). pnpm 가상 스토어의
 * 호이스트 디렉터리(`node_modules/.pnpm/node_modules`)를 NODE_PATH로 `ios/.xcode.env`에 덧붙여
 * dev(`expo start`, shim 경유)와 같은 해석 경로를 준다. prebuild마다 재생성되는 파일이라 플러그인으로 굳힌다.
 */
const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

const MARKER = "# pnpm: NODE_PATH for Xcode script phases";

module.exports = function withPnpmNodePath(config) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const envFile = path.join(cfg.modRequest.platformProjectRoot, ".xcode.env");
      const hoisted = path.join(cfg.modRequest.projectRoot, "../../node_modules/.pnpm/node_modules");
      const current = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
      if (!current.includes(MARKER)) {
        fs.writeFileSync(
          envFile,
          `${current.trimEnd()}\n\n${MARKER}\nexport NODE_PATH="\${NODE_PATH:+$NODE_PATH:}${hoisted}"\n`,
        );
      }
      return cfg;
    },
  ]);
};
