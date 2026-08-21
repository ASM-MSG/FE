/**
 * 웹과 같은 토큰 preset을 nativewind/preset과 함께 로드한다.
 * content에 ui-native 소스를 반드시 포함해야 패키지 안에서 쓴 클래스가 빌드된다
 * (DESIGN_SYSTEM_SPEC 3번 주의점 2).
 */
const { nativePreset } = require("@fillmap/tailwind-preset/native");

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [nativePreset, require("nativewind/preset")],
  content: [
    "./src/**/*.{ts,tsx}",
    "./.rnstorybook/**/*.{ts,tsx}",
    "../../packages/ui-native/src/**/*.{ts,tsx}",
  ],
};
