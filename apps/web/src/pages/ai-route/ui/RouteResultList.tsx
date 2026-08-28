import { useEffect, useRef } from "react";
import type { RoutePointDto } from "@/shared/api/generated";
import { RouteStopCard } from "./RouteStopCard";
import { RouteWalkConnector } from "./RouteWalkConnector";
import { useRouteLegs } from "./use-route-legs";

/**
 * 결과 카드 + 구간 커넥터 조립 (Figma 15666:12855).
 * 마커 클릭으로 선택이 바뀌면 그 카드를 패널 안에서 보이게 스크롤한다 (S8) —
 * 뷰-레이어 DOM 조작이라 페이지 ui에 둔다(모델은 순수 유지).
 */
interface RouteResultListProps {
  points: RoutePointDto[];
  selectedOrder: number | null;
  onSelect: (order: number) => void;
}

export const RouteResultList = ({
  points,
  selectedOrder,
  onSelect,
}: RouteResultListProps) => {
  const legs = useRouteLegs(points);
  const cardRefs = useRef(new Map<number, HTMLLIElement>());

  useEffect(() => {
    if (selectedOrder === null) return;
    // jsdom에는 scrollIntoView가 없다 — 옵셔널 호출로 테스트 환경을 통과시킨다
    cardRefs.current.get(selectedOrder)?.scrollIntoView?.({ block: "nearest" });
  }, [selectedOrder]);

  return (
    <ul className="flex flex-col gap-1.5">
      {points.map((point, index) => {
        const leg = legs.find((item) => item.toOrder === point.order);
        return (
          <li
            key={point.order}
            ref={(node) => {
              if (node) cardRefs.current.set(point.order, node);
              else cardRefs.current.delete(point.order);
            }}
          >
            {index > 0 && leg && (
              <div className="py-1.5">
                <RouteWalkConnector label={leg.label} />
              </div>
            )}
            <RouteStopCard
              point={point}
              selected={point.order === selectedOrder}
              onSelect={() => onSelect(point.order)}
            />
          </li>
        );
      })}
    </ul>
  );
};
