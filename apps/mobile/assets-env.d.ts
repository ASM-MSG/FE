/** metro 정적 이미지 import용 선언 — expo/types에 이미지 모듈 선언이 없어 로컬 보충 (MSG-292) */
declare module "*.png" {
  const source: import("react-native").ImageRequireSource;
  export default source;
}
