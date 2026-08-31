import { useEffect, useState } from "react";
import { DAY_MS, KST_OFFSET_MS, todayKstDate } from "./event-chip";

/**
 * 다음 KST 자정까지 남은 ms (순수 — KST는 DST 없는 고정 UTC+9).
 * 자정 정각이면 다음 자정까지 만 하루를 준다 — 0을 돌려주면 타이머가 같은 자정에
 * 반복 발화한다.
 */
export const msUntilNextKstMidnight = (nowMs: number): number =>
  DAY_MS - ((nowMs + KST_OFFSET_MS) % DAY_MS);

/**
 * KST 기준 "오늘"을 자정 전환까지 추종하는 훅 (codex 리뷰 P2 — MSG-516).
 * 렌더 시점 고정값(todayKstDate() 직접 호출)은 자정을 넘겨 열어 둔 화면에서 D-day가
 * 전날 값에 머문다. setTimeout 재예약 체인이라 state 미변경 경로에서도 끊기지 않는다.
 */
export const useKstToday = (): string => {
  const [today, setToday] = useState(() => todayKstDate());

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const schedule = () => {
      id = setTimeout(() => {
        setToday(todayKstDate());
        schedule();
      }, msUntilNextKstMidnight(Date.now()));
    };
    schedule();
    return () => clearTimeout(id);
  }, []);

  return today;
};
