/** NativeWind 연결 — jsxImportSource로 className prop을 RN 스타일로 변환한다 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
