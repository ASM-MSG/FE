/**
 * NativeWind(Tailwind v3)용 preset — 웹 preset(index.ts)을 그대로 포함하고,
 * Tailwind v4가 동적 생성하는 숫자 스케일(0.25rem 배수) 중 ui-native가 쓰는
 * 스텝만 v4와 동일한 값(n × 4px)으로 보충한다.
 * v3는 고정 스케일만 지원하므로 이 보충이 없으면 해당 클래스가 생성되지 않는다.
 * 토큰 값 자체는 전부 index.ts(preset)에서 오며, 여기서는 값을 새로 정의하지 않는다.
 */
import type { Config } from "tailwindcss";
import { preset } from "./index";

/**
 * ui-native·apps/mobile이 사용하는 v3 기본 스케일 밖 숫자 스텝 (값 = n × 4px, v4 동적 스케일과 동일).
 * 4.5(카카오 로고 18px)·15.5(카카오 버튼 62px)·52.5(로그인 halo 210px)는 MSG-293 로그인 화면 보충.
 * 1.75(테마 배지 패딩 7px)·50(대표 영상 썸네일 200px)는 MSG-298 테마 시트 보충.
 * 1.25(CellBadge 세로 패딩 5px — ui-web 미러)·6.5(Checkbox 원형 26px)는 MSG-420 ui-native 보충.
 * 13(온보딩 3장 테마 격자 52px)은 MSG-421 온보딩 보충.
 */
const nativeSpacingSteps = [
  0.75, 1.25, 1.75, 4.5, 5.5, 6.5, 7.5, 13, 15, 15.5, 19.5, 21, 22, 26, 35, 50,
  52.5, 120,
] as const;

export const nativePreset: Omit<Config, "content"> = {
  presets: [preset as Config],
  theme: {
    extend: {
      spacing: Object.fromEntries(
        nativeSpacingSteps.map((n) => [String(n), `${n * 4}px`]),
      ),
    },
  },
};

export default nativePreset;
