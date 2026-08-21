/**
 * 빌드 주입 전역 상수 선언 — vite.config.ts `define` 대응.
 */

/** 앱 버전 (package.json version, MSG-329 A5). vitest에서는 "0.0.0-test" 센티널 */
declare const __APP_VERSION__: string;
