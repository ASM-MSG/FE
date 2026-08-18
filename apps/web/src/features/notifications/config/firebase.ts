/**
 * Firebase 웹 config + VAPID 공개키 — **정본 단일 모듈** (MSG-408 AC 12).
 *
 * 코드 상수 커밋은 VITE_ env 컨벤션의 명시적 예외다(사용자 승인, 2026-08-17 — 스펙 결정 2):
 * 전부 클라이언트에 노출되는 공개 식별자(비밀 아님)이고, firebase-messaging-sw.js는
 * Vite public/이라 env를 못 읽어 앱이 SW 등록 URL 쿼리스트링으로 전달해야 하므로
 * 정본을 코드 상수 1곳에 둔다. 다른 곳에 중복 선언하지 않는다.
 * measurementId·getAnalytics는 애널리틱스용 — 이 티켓 미사용 (티켓 명시).
 */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAMrrvZWWtPHOqAl_ypabNA3q0AawVWzuc",
  authDomain: "fillmap-edd7d.firebaseapp.com",
  projectId: "fillmap-edd7d",
  storageBucket: "fillmap-edd7d.firebasestorage.app",
  messagingSenderId: "1009335347123",
  appId: "1:1009335347123:web:f881457b6f5604fae24dc6",
} as const;

/** 웹 푸시 VAPID 공개키 — getToken(vapidKey) 전용 (티켓 "키/설정" 절 수급) */
export const VAPID_PUBLIC_KEY =
  "BL3EJReT5MaHvyaAKML2gCTYDf0HNXuz4mHX9dVopQwMqomv39U0GbEFTAm_qRMWXIJa-4opXyQ9FXZkEpBhv9Y";
