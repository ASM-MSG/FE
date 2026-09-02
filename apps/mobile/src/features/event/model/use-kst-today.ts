import { useEffect, useState } from "react";
import { DAY_MS, KST_OFFSET_MS, todayKstDate } from "./event-chip";

/**
 * 웹 `features/event/model/use-kst-today.ts` 포팅 (MSG-557 D8).
 * 다음 KST 자정까지 남은 ms (순수 — KST는 DST 없는 고정 UTC+9). 자정 정각이면 만 하루 —
 * 0을 돌려주면 타이머가 같은 자정에 반복 발화한다.
 */
export const msUntilNextKstMidnight = (nowMs: number): number =>
  DAY_MS - ((nowMs + KST_OFFSET_MS) % DAY_MS);

/**
 * KST 기준 "오늘"을 자정 전환까지 추종하는 훅 — 렌더 시점 고정값은 자정을 넘겨 열어 둔
 * 화면에서 D-day가 전날 값에 머문다. setTimeout 재예약 체인.
 */
export const useKstToday = (): string => {
  const [today, setToday] = useState(() => todayKstDate());
  const [armed, rearm] = useState(0);

  // 이펙트 1회가 타이머 1개를 소유하고 클린업이 그것을 걷는다. 다음 자정 타이머는 `armed`가
  // 바뀌어 이펙트가 다시 돌 때 건다 — 중첩 재예약 체인(웹 원본)은 react-doctor
  // effect-needs-cleanup이 클린업을 못 따라가 CI error로 잡혀 이 형태로 바꿨다 (PR #123).
  // `today`가 아니라 `armed`로 재무장하는 이유: 타이머가 자정 직전에 깨어나 날짜가 같으면
  // `today`는 안 바뀌어 체인이 끊기기 때문이다.
  useEffect(() => {
    const id = setTimeout(() => {
      setToday(todayKstDate());
      rearm((n) => n + 1);
    }, msUntilNextKstMidnight(Date.now()));
    return () => clearTimeout(id);
  }, [armed]);

  return today;
};
