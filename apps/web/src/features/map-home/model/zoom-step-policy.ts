/**
 * 지도 줌 스텝 정책 (MSG-462 AC 1·2) — 휠 델타 누적 + 쿨다운 스텝 판정.
 * 순수 모듈 — 지도 SDK/플랫폼에 의존하지 않는다(RN 재사용 대상). 시각은 인자로 받는다.
 *
 * 네이버 SDK에는 줌 "속도" 옵션이 없어(`scrollWheel`은 on/off뿐) SDK 휠 줌을 끄고
 * 자체 리스너가 이 정책을 거쳐 ±1 단씩만 줌한다. 줌 버튼(+/−)도 같은 상태를 공유해
 * 연타가 쿨다운 간격으로만 진행된다 — "휠·트랙패드·핀치·버튼 모두 같은 속도 기준"(티켓).
 *
 * 규칙:
 * - 스텝 발행 후 쿨다운 안의 입력은 스텝 0이고 누적도 버린다 — 큰 플링 한 번이
 *   여러 단으로 튀지 않는다 (AC 3의 근거)
 * - 쿨다운 경과 후 델타 누적이 임계에 닿으면 방향당 정확히 ±1 스텝 (초과분 미이월)
 * - 델타 부호가 반전되면 누적을 리셋하고 새 방향부터 다시 누적한다
 */

/** 스텝 간 최소 간격(ms) — 브라우저 체감 튜닝의 단일 정의 (스펙 추정 5) */
export const ZOOM_STEP_COOLDOWN_MS = 200;
/**
 * 스텝 1단을 발행하는 델타 누적 임계 — 마우스 휠 1노치(Chrome 실측 ~100)로 1단,
 * 트랙패드 미세 스크롤은 여러 이벤트를 누적해야 1단이 되게 잡는다
 */
export const WHEEL_STEP_THRESHOLD = 80;

export interface ZoomStepState {
  /** 진행 중인 델타 누적 — 부호가 방향(음수=확대 의도) */
  readonly accum: number;
  /** 마지막 스텝 발행 시각(ms) — 쿨다운 기준점 */
  readonly lastStepAt: number;
}

export const initialZoomStepState: ZoomStepState = {
  accum: 0,
  lastStepAt: Number.NEGATIVE_INFINITY,
};

/** 판정 결과 — +1 확대 / −1 축소 / 0 무동작 */
export type ZoomStep = -1 | 0 | 1;

export interface ZoomStepResult {
  state: ZoomStepState;
  step: ZoomStep;
}

const inCooldown = (state: ZoomStepState, now: number): boolean =>
  now - state.lastStepAt < ZOOM_STEP_COOLDOWN_MS;

/**
 * 휠·트랙패드 입력 1건 판정. deltaY 부호는 브라우저 관례 그대로 —
 * 음수(위로 굴림)=확대(+1), 양수(아래로 굴림)=축소(−1). [AC 1]
 */
export const applyWheel = (
  state: ZoomStepState,
  deltaY: number,
  now: number,
): ZoomStepResult => {
  if (inCooldown(state, now)) return { state: { ...state, accum: 0 }, step: 0 };
  if (deltaY === 0) return { state, step: 0 };

  // 부호 반전이면 이전 누적을 버리고 새 방향의 이번 델타부터 시작한다
  const reversed =
    state.accum !== 0 && Math.sign(deltaY) !== Math.sign(state.accum);
  const accum = reversed ? deltaY : state.accum + deltaY;

  if (Math.abs(accum) < WHEEL_STEP_THRESHOLD)
    return { state: { ...state, accum }, step: 0 };

  // 방향당 정확히 1스텝 — 초과 누적은 이월하지 않는다 (한 제스처 = 최대 1단)
  return { state: { accum: 0, lastStepAt: now }, step: accum < 0 ? 1 : -1 };
};

/** 줌 버튼(+/−) 입력 판정 — 휠과 같은 리미터(쿨다운)를 거친다. [AC 2] */
export const applyButton = (
  state: ZoomStepState,
  direction: 1 | -1,
  now: number,
): ZoomStepResult => {
  if (inCooldown(state, now)) return { state, step: 0 };
  return { state: { accum: 0, lastStepAt: now }, step: direction };
};
