/**
 * 미션·포토스팟 카드의 `영상 N` 임시 목 수치 (MSG-395 AC 13·23).
 *
 * **교체 지점** — 백엔드 API 개편에 `videoCount`가 포함될 예정이다(사용자 확인).
 * 서버 필드가 도착하면 이 파일의 두 함수를 응답 필드 참조로 바꾸고 파일을 지운다.
 * 목록 카드마다 격자 영상을 조회하면 요청이 미션 수 × 격자 수로 늘어나 목을 택했다.
 *
 * 무작위가 아니라 **키에서 결정적으로** 뽑는다 — 재렌더마다 숫자가 흔들리면 목이라는
 * 사실보다 화면이 고장 난 것처럼 보인다.
 */

/** 목 수치 상한 — Figma 시안의 자릿수(한 자리~두 자리)와 같은 눈금 */
const MOCK_MAX = 12;

/** 문자열 키 → 0 이상 정수 해시 (djb2 축약) */
const hashKey = (key: string): number => {
  let hash = 5381;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 33 + key.charCodeAt(i)) % 2_147_483_647;
  }
  return hash;
};

/** 미션 카드 `영상 N` — 0이면 뷰가 배지를 생략한다 */
export const mockMissionVideoCount = (missionId: number): number =>
  hashKey(`mission:${missionId}`) % (MOCK_MAX + 1);

/** 포토스팟 행 `영상 N` — 0이면 `영상 없음`으로 표시한다 */
export const mockGridVideoCount = (gridId: string): number =>
  hashKey(`grid:${gridId}`) % (MOCK_MAX + 1);
