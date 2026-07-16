# 결정 기록 (Decision Log)

트레이드오프 판단, 테스트가 실제 버그를 잡은 순간, 스펙 해석 결정을 한 줄씩 기록한다.
형식: `| 날짜 | 티켓 | 결정/발견 | 근거 |`

| 날짜 | 티켓 | 결정/발견 | 근거 |
|------|------|----------|------|
| 2026-07-15 | MSG-108 | 발견: `cn()`(tailwind-merge)이 커스텀 토큰 클래스(`p-xs` vs `p-xl` 등) 충돌을 병합하지 못함 — vitest 셋업 첫 스모크 테스트가 발견. `extendTailwindMerge`로 토큰 스케일 등록 필요(별도 티켓 권장, ui-web의 cn도 동일 이슈) | 기본 twMerge 설정은 Tailwind 기본 스케일만 인식. 토큰 충돌 시 둘 다 DOM에 남아 CSS 순서가 승자를 결정하는 잠재 버그 |
| 2026-07-15 | MSG-108 | 테스트 전략: 로직 레이어(훅·스토어·스키마·유틸)만 test-first, 뷰는 브라우저 실동작 검증 | 뷰는 기획·디자인 변경으로 스펙이 자주 바뀌어 테스트 유지비가 회수율을 초과. 로직은 안정적이고 RN 재사용 대상이라 투자 가치 높음. 뷰-로직 분리로 뷰 테스트 추가는 필요 시점에 저비용 가능(되돌리기 쉬운 결정) |
| 2026-07-16 | MSG-112 | 결정: `shared/geolocation.ts`가 `entities/cell`의 `LatLng`를 import하지 않고 구조 호환 `GeoCoords`를 로컬 정의 | FSD 최하위 layer인 shared가 상위 entities에 의존하면 layer 규칙 위반. 두 타입은 `{lat,lng}`로 구조 호환이라 대입 가능 — 결합 없이 재사용성 유지 |
| 2026-07-16 | MSG-112 | 결정: 카카오맵 SDK 로드 실패 재시도(S3)를 `attempt` state 키로 하위 뷰 remount하여 `useKakaoLoader`를 재실행 | 로더는 멱등·캐시라 동일 위치 재호출로는 재로딩 안 됨. remount가 SDK 경계 안에서 재시도를 트리거하는 가장 단순한 방법 |
| 2026-07-16 | MSG-112 | 발견: 카카오맵 SDK가 `http://localhost` 출처의 요청을 503으로 거부(콘솔 도메인 등록과 별개) — dev에서 지도를 보려면 https 서빙 필요 | 검증 중 네트워크 계측으로 확인: 같은 키로 https·무Referer 요청은 200, `Referer: http://localhost:5173` 요청은 503. SDK가 프로토콜 상대 URL을 써서 http 페이지에선 http로 요청됨. dev https화(예: vite basic-ssl)는 별도 티켓 권장 |
