import { boundsCenter, distanceMeters, type Bounds } from "@/entities/cell";
import type { LatLng } from "@/entities/cell";

/**
 * 칩 진입 시 고를 최근접 대상 파생 (MSG-451 AC 9·10).
 * 순수 함수 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상).
 *
 * 미션(축제·팝업)과 코스가 같은 판정을 쓰므로 `MissionView`·`CourseView`를 직접 받지 않고
 * **도형 경계만 요구하는 최소 구조**로 제네릭을 건다 — 목록 타입이 갈라져도 여기는 그대로다.
 *
 * 대표점은 **경계 상자의 중심**이다(스펙 추정 4). 코스의 스팟 평균이나 미션의 첫 격자를
 * 쓰면 유형마다 기준이 달라져 "가장 가까운 것"이 목록 종류에 따라 뒤집힌다.
 */
interface Locatable {
  shape: { bbox: Bounds | null };
}

export const nearestTarget = <T extends Locatable>(
  targets: readonly T[],
  center: LatLng | null,
): T | null => {
  if (center === null) return null;

  let nearest: T | null = null;
  let shortest = Number.POSITIVE_INFINITY;

  for (const candidate of targets) {
    // 좌표를 못 판별한 대상(bbox null)은 옮겨 갈 곳이 없어 후보가 아니다
    if (candidate.shape.bbox === null) continue;

    const distance = distanceMeters(center, boundsCenter(candidate.shape.bbox));
    // 동률에서 갱신하지 않으므로 목록 순서가 앞선 대상이 남는다 (AC 9)
    if (distance < shortest) {
      shortest = distance;
      nearest = candidate;
    }
  }

  return nearest;
};
