import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { unwrapEnvelope } from "@/shared/api/envelope";
import type { GridMissionResponseDto } from "@/shared/api/generated";
import { getMissionsByGridOptions } from "@/shared/api/generated/@tanstack/react-query.gen";
import { resolveGridMission, type EventChip } from "./grid-mission-resolve";
import { MAP_QUERY_STALE_TIME } from "./map-query-policy";

/**
 * 축제·팝업 칩 활성 중 격자 탭 라우팅 (MSG-462 AC 7·8·10·13) — 셀 탭 핸들러 래퍼.
 * 지도 SDK·라우터를 import하지 않고 선택 동작은 콜백으로 주입받는다(RN 경계).
 *
 * 칩 활성이면 `GET /api/grids/{gridId}/missions`를 조회(**익명 게이트 없음** — 서버
 * MSG-454 허용, AC 13)해 판정(grid-mission-resolve)에 따라 미션 상세 또는 격자 상세를
 * 연다. 조회 실패도 판정 함수로 흘려 화면을 막는 오류 없이 폴백한다 (AC 10).
 * `fetchQuery`라 격자별 캐시가 남는다 — 같은 격자 재탭은 staleTime 안에서 재요청이 없다.
 *
 * **스테일 응답 폐기 (리뷰 P1)** — 최신 요청 토큰으로 obsolete 완료를 선택 콜백 호출 전에
 * 버린다: ① 격자 연타 시 느린 이전 요청의 응답이 나중 선택을 덮어쓰지 않고, ② 응답 대기
 * 중 칩이 바뀌거나 꺼지면(판정 전제인 칩 type·도형 소속이 무효) 그 응답으로 아무것도
 * 선택하지 않는다.
 */
interface GridMissionRoutingInput {
  /** 활성 축제·팝업 칩 — null이면 조회 없이 격자 상세 직행(기존 경로 보존) */
  chip: EventChip | null;
  /** 활성 미션 도형 소속 맵 — API가 빈 배열일 때의 FE 폴백 판정 입력 (AC 6ⓑ) */
  membership: ReadonlyMap<string, number>;
  selectMission: (missionId: number) => void;
  selectCell: (gridId: string) => void;
}

export const useGridMissionRouting = ({
  chip,
  membership,
  selectMission,
  selectCell,
}: GridMissionRoutingInput): ((gridId: string) => void) => {
  const queryClient = useQueryClient();
  // 최신 요청 토큰 (리뷰 P1) — 새 탭마다 증가시키고, 완료 시점에 자기 토큰이 아직
  // 최신일 때만 선택 콜백을 부른다. 칩 전환·해제도 아래 effect로 토큰을 올려 무효화한다
  const latestRequestRef = useRef(0);
  useEffect(() => {
    latestRequestRef.current += 1;
  }, [chip]);

  return useCallback(
    (gridId: string) => {
      if (chip === null) {
        selectCell(gridId);
        return;
      }
      const token = ++latestRequestRef.current;
      void (async () => {
        let responses: GridMissionResponseDto[] | null;
        try {
          responses = unwrapEnvelope(
            await queryClient.fetchQuery({
              ...getMissionsByGridOptions({ path: { gridId } }),
              staleTime: MAP_QUERY_STALE_TIME,
              // 클릭 응답 경로다 — 기본 재시도(3회 백오프)를 기다리게 하지 않고
              // 즉시 판정으로 흘려 격자 상세로 폴백한다 (AC 10)
              retry: false,
            }),
          );
        } catch {
          responses = null;
        }
        // obsolete 완료 폐기 (리뷰 P1) — 더 새 탭이 있었거나 칩이 바뀌었다
        if (token !== latestRequestRef.current) return;
        const missionId = resolveGridMission({
          gridId,
          chip,
          responses,
          membership,
        });
        if (missionId !== null) selectMission(missionId);
        else selectCell(gridId);
      })();
    },
    [chip, membership, selectMission, selectCell, queryClient],
  );
};
