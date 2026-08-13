import { useEffect } from "react";
import { Button } from "@fillmap/ui-web";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { useViewportStore } from "@/features/map-home/model/viewport-store";
import { headerRegionName } from "@/features/region/model/region-header";
import { useRegionPanelStore } from "@/features/region/model/region-panel-store";
import { shouldShowReload } from "@/features/region/model/region-reload";
import { useRegionGridsQuery } from "@/features/region/model/use-region-grids-query";
import { useReverseGeocodeQuery } from "@/features/region/model/use-reverse-geocode-query";
import { RegionGridCard } from "./RegionGridCard";
import { RegionListView } from "./RegionListView";
import { RegionReloadButton } from "./RegionReloadButton";
import { RetryNotice } from "./RetryNotice";

interface RegionPanelProps {
  /**
   * 격자 카드 클릭 — 첫 영상 미니 패널 재생 + 지도 테두리 강조 배선(사용자 피드백 —
   * 지도 이동·상세 없음)은 페이지(MapHomePage)가 조립한다
   */
  onGridSelect: (gridId: string) => void;
}

/**
 * 지역 격자 패널 (MSG-328 AC 4~12, Figma 14357-18972) — 홈 좌측 패널의 기본 분기.
 * 지도 중심(viewport-store)의 reverse-geocode로 현재 행정동을 판별해 헤더에 표시하고,
 * 그 행정동의 격자 카드를 세로 리스트로 보여준다. 헤더 텍스트는 재검색 버튼 라벨과
 * 동일하게 지도 이동을 따라 라이브 갱신된다(사용자 보완 1 — 선택 로직 region-header,
 * 전체 보기 명시 선택은 예외로 고정). 지도를 이동해 중심 행정동이 달라지면 하단에
 * "{새 행정동} 장소 불러오기" 재검색 버튼이 뜨고, **격자 리스트**는 클릭 시에만 갱신된다
 * (기확정 해석 — 자동 갱신 아님). "전체 보기"는 패널 안 전체 지역 리스트로 전환한다.
 *
 * 5개 지역·검색 엔드포인트 모두 익명 401 실측(2026-08-13, api.fillmap.kr) — 비로그인은
 * 조회를 게이트하고 로그인 유도 UI를 보여준다. 401을 그대로 쏘면 auth-pipeline의
 * 재발급 실패 → 세션 만료 처리(로그인 모달 강제 오픈)가 홈 진입만으로 발동한다.
 */
export const RegionPanel = ({ onGridSelect }: RegionPanelProps) => {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const openLoginModal = useLoginModalStore((s) => s.openModal);
  const center = useViewportStore((s) => s.center);

  const displayed = useRegionPanelStore((s) => s.displayedRegion);
  const origin = useRegionPanelStore((s) => s.origin);
  const mode = useRegionPanelStore((s) => s.mode);
  const showRegion = useRegionPanelStore((s) => s.showRegion);
  const openRegionList = useRegionPanelStore((s) => s.openRegionList);

  const reverse = useReverseGeocodeQuery(isAuthenticated ? center : null);
  const grids = useRegionGridsQuery(
    isAuthenticated ? (displayed?.regionCode ?? null) : null,
  );

  // 최초 진입 — 표시 지역이 없으면 현재 중심 행정동을 자동 채택한다. 이후 지도 이동은
  // 재검색 버튼 클릭에만 반응한다. 행정동 밖(null)이면 채택하지 않아 격자 조회도 없다 (AC 12)
  const currentRegion = reverse.region;
  useEffect(() => {
    if (displayed === null && currentRegion !== null) {
      showRegion(
        {
          regionCode: currentRegion.regionCode,
          regionName: currentRegion.regionName,
        },
        "auto",
      );
    }
  }, [displayed, currentRegion, showRegion]);

  if (!isAuthenticated) {
    return (
      <section className="flex flex-col items-center gap-md py-lg text-center">
        <p className="text-fm-body text-foreground-muted">
          로그인하면 이 지역의 격자와 영상을 볼 수 있어요.
        </p>
        <Button
          text="로그인"
          variant="primary"
          size="sm"
          onClick={openLoginModal}
        />
      </section>
    );
  }

  // 재검색 버튼 대상 — 격자 리스트 모드에서 표시 중 행정동 ≠ 현재 중심 행정동일 때만 (AC 8)
  const reloadTarget =
    mode === "grids" &&
    currentRegion !== null &&
    shouldShowReload(displayed?.regionCode ?? null, currentRegion.regionCode)
      ? currentRegion
      : null;

  return (
    <>
      <section className="flex min-h-0 flex-1 flex-col gap-md">
        {mode === "regions" ? (
          <>
            <header className="flex items-center justify-between gap-sm">
              <h2 className="truncate text-fm-heading text-foreground">
                전체 지역
              </h2>
            </header>
            {/* 전체 보기의 지역 선택 = 명시 선택(manual) — 헤더가 선택 지역명에 고정된다 */}
            <RegionListView
              onSelect={(region) => showRegion(region, "manual")}
            />
          </>
        ) : displayed === null ? (
          reverse.isError ? (
            <RetryNotice
              message="지역 정보를 불러오지 못했어요"
              onRetry={reverse.retry}
            />
          ) : !reverse.isResolved ? (
            <p className="py-sm text-fm-body text-foreground-muted">
              현재 지역을 확인하는 중이에요…
            </p>
          ) : (
            // reverse-geocode data null — 바다·행정동 밖 (AC 12). 격자 조회는 실행되지 않는다
            <p className="py-sm text-fm-body text-foreground-muted">
              지도 중심에 행정동이 없어요. 지도를 움직여 다른 지역을 살펴보세요.
            </p>
          )
        ) : (
          <>
            <header className="flex items-center justify-between gap-sm">
              {/* 행정동 표기는 서버 regionName 원문 (추정 8) — 길면 truncate.
                  헤더는 지도 이동에 라이브 동기화(auto), 전체 보기 선택은 고정(manual) */}
              <h2 className="truncate text-fm-heading text-foreground">
                {headerRegionName(
                  displayed.regionName,
                  currentRegion?.regionName ?? null,
                  origin,
                )}
              </h2>
              <button
                type="button"
                onClick={openRegionList}
                className="shrink-0 text-fm-label text-primary transition-opacity active:opacity-60"
              >
                전체 보기
              </button>
            </header>
            {/* 표시 지역이 있어도 이동 후 행정동 조회 실패를 숨기지 않는다 (리뷰 P2) —
                실패 시 currentRegion이 null이라 재검색 버튼이 못 뜨므로, 이 재시도가
                "장소 불러오기" 흐름의 유일한 복구 경로다. 헤더·리스트는 이전 지역 유지 */}
            {reverse.isError && (
              <RetryNotice
                message="현재 지역을 확인하지 못했어요"
                onRetry={reverse.retry}
              />
            )}
            {grids.isError ? (
              <RetryNotice
                message="격자 정보를 불러오지 못했어요"
                onRetry={grids.retry}
              />
            ) : grids.isPending || grids.data === undefined ? (
              <p className="py-sm text-fm-body text-foreground-muted">
                이 지역 격자를 불러오는 중이에요…
              </p>
            ) : grids.data.grids.length === 0 ? (
              <p className="py-sm text-fm-body text-foreground-muted">
                이 지역에는 아직 격자가 없어요. 지도를 움직여 다른 지역을
                둘러보세요.
              </p>
            ) : (
              <ul className="flex min-h-0 flex-1 flex-col gap-md overflow-y-auto scrollbar-gutter-stable">
                {grids.data.grids.map((grid) => (
                  <li key={grid.gridId}>
                    <RegionGridCard
                      grid={grid}
                      regionName={displayed.regionName}
                      onSelect={onGridSelect}
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
      {reloadTarget && (
        <RegionReloadButton
          regionName={reloadTarget.regionName}
          onClick={() =>
            showRegion(
              {
                regionCode: reloadTarget.regionCode,
                regionName: reloadTarget.regionName,
              },
              "auto",
            )
          }
        />
      )}
    </>
  );
};
