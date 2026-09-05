import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CONSOLE_ROUTES } from "@/app/console-routes";
import {
  hydrationFromDetail,
  type SubmissionEditHydration,
} from "@/features/event-submission/model/submission-edit";
import { useSubmissionWizardStore } from "@/features/event-submission/model/submission-wizard-store";
import { useSubmissionDetailQuery } from "@/features/org-submissions/api/use-submission-detail-query";
import { parseSubmissionId } from "@/features/org-submissions/model/submission-detail-view";

/**
 * 수정 모드 진입 훅 (MSG-550 AC 1·8) — **뷰-레이어 훅**이다: 라우터(`useParams`)를 읽으므로
 * RN 재사용 대상이 아니고, 순수 판정은 전부 `submission-edit`(플랫폼 중립)에 있다
 * (`use-home-entry-lifecycle` 선례).
 *
 * `/org/submissions/new`에서는 경로 파라미터가 없어 아무 일도 하지 않는다 — 위저드 페이지가
 * 두 라우트를 공용하므로 이 훅이 라우트 판별의 단일 지점이다.
 *
 * **hydrate와 페이지 reset의 순서가 이 훅의 핵심 계약이다**: 위저드 페이지는 마운트·경로
 * 변화 때 스토어를 초기화하는데(비영속 — 남의 신청서 유출 차단), 그 초기화가 프리필보다
 * 늦으면 프리필이 지워진다. 페이지의 초기화는 **layout effect**(커밋 시점)이고 이 훅의
 * hydrate는 **passive effect**라 항상 초기화가 먼저다 — 상세 응답이 캐시에 이미 있어
 * 첫 렌더에 도착하는 동선(상세 화면 CTA → 수정)에서도 순서가 뒤집히지 않는다.
 * 재hydrate 판정은 ref가 아니라 **스토어의 editContext**를 본다: 초기화가 컨텍스트를
 * 지우면 그 사실만으로 다시 채워진다(자기 치유).
 */
export interface SubmissionEditEntry {
  /** `/edit` 라우트 진입인가 — `/new`는 false (무동작) */
  isEditRoute: boolean;
  /** 경로 파라미터 원문 — 페이지 초기화 effect의 의존성(경로 전이 시 재초기화) */
  routeParam: string | null;
  /** 숫자가 아닌 신청 번호 — 요청을 발사하지 않고 안내로 수렴한다 (549 선례) */
  isInvalidId: boolean;
  /** 상세 로딩 또는 프리필 이전 — 위저드 본문 대신 Skeleton을 그린다 */
  isPending: boolean;
  isError: boolean;
  retry: () => void;
  /** 수정 불가(비반려·미지 유형) — 이 신청 상세로 replace 회송한다 (AC 8) */
  redirectTo: string | null;
}

/** 이번 방문의 진입 허가 — 어느 경로 파라미터에서 났는지를 함께 들어야 방문이 갈린다 */
interface EditGrant {
  visitedId: number | null;
  granted: boolean;
}

export const useSubmissionEditEntry = (): SubmissionEditEntry => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const isEditRoute = submissionId !== undefined;
  const parsedId = parseSubmissionId(submissionId);

  // 로딩은 훅의 isPending이 아니라 "프리필 완료 여부"로 판정한다 — 응답 도착과 프리필
  // 사이의 한 프레임에도 위저드 본문(빈 유형 스텝)이 보이면 안 된다
  const { detail, isError, retry } = useSubmissionDetailQuery(parsedId);
  const hydrate = useSubmissionWizardStore((state) => state.hydrate);
  const hydratedId = useSubmissionWizardStore(
    (state) => state.editContext?.submissionId ?? null,
  );

  const hydration = useMemo<SubmissionEditHydration | null>(
    () => (detail === null ? null : hydrationFromDetail(detail)),
    [detail],
  );
  const blocked = hydration !== null && "blocked" in hydration;
  const isHydrated = parsedId !== null && hydratedId === parsedId;

  /**
   * 회송 판정을 이미 통과했는가 — **가드는 방문(visit) 단위로 진입 시 1회 판정한다**
   * (MSG-550 재작업 1·2회차).
   *
   * 상세 응답은 위저드가 열려 있는 동안에도 갱신된다(재제출 성공 무효화 재조회, 창 포커스
   * 재조회 — staleTime 30초). 갱신본으로 가드를 계속 재판정하면 정상 사용자를 위저드 밖으로
   * 밀어낸다: ① 재제출 성공 시 `getSubmission` 재조회(심사 중)가 목록 이동 커밋을 앞지르면
   * 상세로 replace 회송되고, 그때 `ReviewStep`은 이미 언마운트돼 목록 이동이 삼켜진다 —
   * 사용자가 상세에 갇힌다(스모크로 고정). ② 편집 중 운영자가 상태를 바꾸고 사용자가 탭을
   * 돌아오면 작성분과 함께 튕긴다. 허가 이후의 상태 변화는 회송이 아니라 재제출 실패
   * 안내(AC 7)로 수렴시킨다.
   *
   * **허가는 신청 id가 아니라 방문에 매긴다** (codex 리뷰 P2): 두 라우트가 같은 lazy
   * 컴포넌트라 `/edit/12` → `/new` → `/edit/12`에서 페이지 인스턴스와 이 상태가 살아남는다.
   * id로 매긴 허가는 그 재진입에서 회송을 억제하는데, 경로 변화로 스토어는 이미 초기화돼
   * `editContext`가 없다 → **`/edit` URL에 빈 생성 모드 위저드가 서고 제출이 신규 신청을
   * 만든다.** 그래서 경로 파라미터가 전이하면(다른 신청 · `/new` 이탈 포함) 허가를 버리고
   * 재진입에서 다시 판정한다. 초기화는 effect가 아니라 **렌더 중**이다 — 재진입 첫 커밋에서
   * 옛 허가가 회송을 억제하면 그 프레임의 빈 위저드가 그대로 보인다.
   *
   * 스토어의 `editContext`로는 이 사실을 대신할 수 없다 — 성공 경로의 `reset()`이 그것을
   * 지우고(548 계약), 가드는 애초에 스토어가 아니라 상세 응답만 보고 판정한다.
   */
  const [grant, setGrant] = useState<EditGrant>({
    visitedId: parsedId,
    granted: false,
  });
  if (grant.visitedId !== parsedId) {
    setGrant({ visitedId: parsedId, granted: false });
  }
  // 방금 초기화한 렌더에서는 `grant`가 아직 옛 값이므로 방문 일치를 함께 본다
  const grantedThisVisit = grant.visitedId === parsedId && grant.granted;

  useEffect(() => {
    if (hydration === null || !("ok" in hydration)) return;
    // 이미 이번 방문의 허가면 같은 객체를 돌려 리렌더를 만들지 않는다
    setGrant((prev) =>
      prev.visitedId === hydration.ok.submissionId && prev.granted
        ? prev
        : { visitedId: hydration.ok.submissionId, granted: true },
    );
    if (isHydrated) return;
    hydrate(hydration.ok);
  }, [hydration, isHydrated, hydrate]);

  return {
    isEditRoute,
    routeParam: submissionId ?? null,
    isInvalidId: isEditRoute && parsedId === null,
    isPending: isEditRoute && parsedId !== null && !blocked && !isHydrated,
    isError: isEditRoute && isError && parsedId !== null,
    retry,
    redirectTo:
      blocked && parsedId !== null && !grantedThisVisit
        ? CONSOLE_ROUTES.orgSubmissionDetail.replace(
            ":submissionId",
            String(parsedId),
          )
        : null,
  };
};
