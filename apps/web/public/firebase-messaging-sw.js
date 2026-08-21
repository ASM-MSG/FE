/* eslint-disable */
/**
 * FCM 백그라운드 메시징 서비스 워커 (MSG-408 AC 11·12).
 *
 * Vite public/은 빌드 변환이 없어 env·번들 import를 못 쓴다 — Firebase config는 앱
 * (features/notifications/api/messaging.ts)이 SW 등록 URL 쿼리스트링으로 전달하고
 * (정본은 features/notifications/config/firebase.ts 상수 모듈 1곳 — 여기 중복 선언 금지),
 * SDK는 gstatic CDN compat 스크립트를 importScripts로 로드한다(앱 본체는 npm 번들 —
 * 버전은 apps/web의 firebase 의존성과 맞춘다).
 * 백그라운드 표시는 최소 구현 — 제목·본문·앱 아이콘 (스펙 추정 6).
 */
importScripts(
  "https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js",
);

const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
  apiKey: params.get("apiKey"),
  projectId: params.get("projectId"),
  messagingSenderId: params.get("messagingSenderId"),
  appId: params.get("appId"),
});

firebase.messaging().onBackgroundMessage((payload) => {
  const notification = payload.notification ?? {};
  self.registration.showNotification(notification.title ?? "FillMap", {
    body: notification.body ?? "",
    icon: "/favicon.png",
  });
});
