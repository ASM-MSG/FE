import type { Cell } from "./cell";

/**
 * 서울 일대 mock 격자 데이터.
 * 실 API 연동 전까지 뷰포트 매칭·요약 집계 시연을 위한 임시 소스.
 * 라벨은 "지역명 + 코드" 형식(Figma 13399-1208 확인), 영상 수는 편차를 두어 배치.
 * createdAt은 "최신순"(D3), durationSec은 카드 길이 배지(S5) 시연용 —
 * 일부 격자는 durationSec을 생략해 배지 미표시(S6)를 검증할 수 있게 둔다.
 */
export const MOCK_CELLS: Cell[] = [
  { id: "A-14", label: "홍대입구 A-14", center: { lat: 37.5573, lng: 126.9245 }, videoCount: 138, createdAt: "2026-07-10T09:00:00.000Z", durationSec: 24 },
  { id: "A-15", label: "합정 A-15", center: { lat: 37.5495, lng: 126.9137 }, videoCount: 72, createdAt: "2026-06-28T09:00:00.000Z", durationSec: 84 },
  { id: "B-07", label: "망원 B-07", center: { lat: 37.5556, lng: 126.9016 }, videoCount: 54, createdAt: "2026-07-05T09:00:00.000Z" },
  { id: "B-08", label: "연남 B-08", center: { lat: 37.5631, lng: 126.9256 }, videoCount: 91, createdAt: "2026-07-14T09:00:00.000Z", durationSec: 132 },
  { id: "C-02", label: "성수 C-02", center: { lat: 37.5446, lng: 127.0559 }, videoCount: 205, createdAt: "2026-07-01T09:00:00.000Z", durationSec: 605 },
  { id: "C-03", label: "건대입구 C-03", center: { lat: 37.5402, lng: 127.0702 }, videoCount: 47, createdAt: "2026-06-20T09:00:00.000Z", durationSec: 47 },
  { id: "D-01", label: "이태원 D-01", center: { lat: 37.5346, lng: 126.9946 }, videoCount: 119, createdAt: "2026-07-12T09:00:00.000Z", durationSec: 210 },
  { id: "D-02", label: "한남 D-02", center: { lat: 37.5344, lng: 127.0016 }, videoCount: 33, createdAt: "2026-06-15T09:00:00.000Z" },
  { id: "E-05", label: "강남역 E-05", center: { lat: 37.4979, lng: 127.0276 }, videoCount: 176, createdAt: "2026-07-08T09:00:00.000Z", durationSec: 366 },
  { id: "E-06", label: "역삼 E-06", center: { lat: 37.5006, lng: 127.0364 }, videoCount: 88, createdAt: "2026-06-30T09:00:00.000Z", durationSec: 59 },
  { id: "F-09", label: "잠실 F-09", center: { lat: 37.5133, lng: 127.1 }, videoCount: 64, createdAt: "2026-07-11T09:00:00.000Z", durationSec: 148 },
  { id: "F-10", label: "송파 F-10", center: { lat: 37.5145, lng: 127.106 }, videoCount: 21, createdAt: "2026-06-25T09:00:00.000Z" },
  { id: "G-03", label: "종로 G-03", center: { lat: 37.5729, lng: 126.9793 }, videoCount: 97, createdAt: "2026-07-13T09:00:00.000Z", durationSec: 302 },
  { id: "G-04", label: "광화문 G-04", center: { lat: 37.5716, lng: 126.9769 }, videoCount: 142, createdAt: "2026-07-03T09:00:00.000Z", durationSec: 75 },
  { id: "H-11", label: "여의도 H-11", center: { lat: 37.5219, lng: 126.9245 }, videoCount: 58, createdAt: "2026-07-06T09:00:00.000Z", durationSec: 41 },
  { id: "H-12", label: "노량진 H-12", center: { lat: 37.5136, lng: 126.9425 }, videoCount: 12, createdAt: "2026-06-18T09:00:00.000Z" },
];
