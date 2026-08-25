import { DotsLoader, cn } from "@fillmap/ui-web";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import {
  formatCourseDuration,
  formatDistanceKm,
} from "@/features/map-home/model/mission-format";
import type { GridNamesResult } from "@/features/map-home/model/use-grid-names-query";
import type { CourseView } from "@/features/map-home/model/mission-view";
import { ChipDetailHeader } from "./ChipDetailHeader";
import { CourseSpotRow } from "./CourseSpotRow";
import { StatTrio } from "./StatTrio";
import { THEME_BADGE_CLASS } from "./theme-classes";
import { useEscapeClose } from "./use-escape-close";

interface CourseDetailPanelProps {
  view: CourseView;
  /** 격자 id → 표시명 (use-grid-names-query). 없는 스팟은 이름 없는 경유 지점 */
  spotNames: GridNamesResult;
  /**
   * 진행도(내 수집 격자) 조회 실패 — `내 진행`과 스팟 방문 여부를 주장하지 않는다
   * (리뷰 반영). 실패 시 전 스팟이 미방문으로 폴백해 사실처럼 보인다
   */
  progressFailed: boolean;
  /**
   * 비로그인 진행도 잠금 (MSG-463 AC 9·확정 2) — `내 진행`은 로그인 유도로, 스팟별
   * `방문함/미방문`은 방문 여부를 모르므로 라벨을 생략한다 (progressFailed와 동일 처리)
   */
  progressLocked: boolean;
  /** 포토스팟 클릭 — 그 격자의 상세로 (AC 24) */
  onSpotSelect: (gridId: string) => void;
  onBack: () => void;
  onClose: () => void;
}

/**
 * 코스 상세 패널 (MSG-395 AC 22·23, Figma 14599-10258).
 * 지역·순환 여부 → 완료 조건 배너 → 3분할 스탯 → 포토스팟 목록(코스 순서).
 *
 * 거리·소요 시간은 코스가 아니면 없는 필드라 null이면 스탯 칸에서 빠진다 —
 * 빈 값을 `-`로 채우면 "0분 걸린다"처럼 읽힌다.
 */
export const CourseDetailPanel = ({
  view,
  spotNames,
  progressFailed,
  progressLocked,
  onSpotSelect,
  onBack,
  onClose,
}: CourseDetailPanelProps) => {
  useEscapeClose(onClose);
  // 리프에서 직접 구독한다 — RegionPanel의 로그인 유도 선례 (페이지 상태와 무관한 전역 모달)
  const openLoginModal = useLoginModalStore((s) => s.openModal);

  // 요소가 전부 준비되기 전에는 도트 로더만 (MSG-403 후속 — 부분 렌더 금지).
  // 스팟 이름이 도착하기 전의 "이름 없는 경유 지점"은 로딩을 부재로 위장하는 거짓말이다
  if (spotNames.isPending)
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <DotsLoader label="코스 상세 불러오는 중" />
      </div>
    );

  const { dto, progress, spots } = view;
  const distance = formatDistanceKm(dto.distanceMeters);
  const duration = formatCourseDuration(dto.durationMinutes);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-md">
      <ChipDetailHeader
        title={view.title}
        status={view.status}
        theme="route"
        onBack={onBack}
      />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-md">
          <p className="text-fm-caption text-foreground-muted">
            {view.placeName
              ? `${view.placeName} · ${view.loop ? "순환형" : "비순환형"}`
              : view.loop
                ? "순환형"
                : "비순환형"}
          </p>

          <p
            className={cn(
              "rounded-sm px-sm py-xs text-fm-body",
              THEME_BADGE_CLASS.route,
            )}
          >
            포토스팟 {spots.length}곳 중 {progress.total}곳을 채우면 완료
          </p>

          <StatTrio
            items={[
              // 비로그인이 실패 표기보다 먼저다 — 익명은 진행도 조회 자체가 없다 (AC 9)
              progressLocked
                ? {
                    label: "내 진행",
                    value: "로그인 후 확인",
                    onClick: openLoginModal,
                  }
                : {
                    label: "내 진행",
                    value: progressFailed
                      ? "확인 불가"
                      : `${progress.done}/${progress.total}곳`,
                  },
              ...(distance ? [{ label: "거리", value: distance }] : []),
              ...(duration ? [{ label: "소요 시간", value: duration }] : []),
            ]}
          />

          <section className="flex flex-col gap-xs">
            <h3 className="text-fm-title text-foreground">
              포토스팟 {spots.length}곳
              <span className="ml-xs text-fm-caption font-normal text-foreground-muted">
                코스 순서
              </span>
            </h3>
            {spots.length === 0 ? (
              <p className="text-fm-body text-foreground-muted">
                이 코스에는 등록된 포토스팟이 없어요
              </p>
            ) : (
              <ul className="flex flex-col">
                {spots.map((spot) => (
                  <CourseSpotRow
                    key={spot.gridId}
                    spot={spot}
                    name={spotNames.names.get(spot.gridId)}
                    visitedUnknown={progressFailed || progressLocked}
                    onSelect={onSpotSelect}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
