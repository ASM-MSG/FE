import {
  areaRowLabel,
  type AreaRect,
} from "@/features/event-submission/model/submission-area";

interface AreaRectListProps {
  rects: AreaRect[];
  onRemove: (index: number) => void;
}

/**
 * "이 위치의 영역" 목록 (MSG-547 AC 5·6 — Figma 15525:9300) — 확정 사각형 행 + 삭제.
 * 행 번호·삭제는 인덱스 기준이다(스토어 `removeAreaRect(index)`) — 같은 사각형을 두 번
 * 확정할 수 있어(합집합이 늘지 않아 차단되지 않는다) 좌표는 식별자가 되지 못한다.
 */
export const AreaRectList = ({ rects, onRemove }: AreaRectListProps) => (
  <section className="flex flex-col gap-xs">
    <p className="text-fm-label text-foreground-body">이 위치의 영역</p>
    {rects.length === 0 ? (
      <p className="text-fm-caption text-foreground-muted">
        아직 추가한 영역이 없어요
      </p>
    ) : (
      <ul className="flex flex-col gap-xxs">
        {rects.map((rect, index) => (
          <li
            // 인덱스가 이 목록의 식별자다(위 주석) — 중복 사각형이 허용되므로 좌표 키는 충돌한다
            key={index}
            className="flex items-center justify-between gap-sm rounded-sm border border-border px-md py-xs"
          >
            <span className="text-fm-body text-foreground">
              {areaRowLabel(rect, index)}
            </span>
            <button
              type="button"
              aria-label={`영역 ${index + 1} 삭제`}
              className="text-fm-label text-error"
              onClick={() => onRemove(index)}
            >
              삭제
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
);
