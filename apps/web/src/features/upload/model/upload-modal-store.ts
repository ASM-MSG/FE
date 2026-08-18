import { create } from "zustand";
import type { LatLng } from "@/entities/cell";
import { useAuthStore } from "@/features/auth/model/auth-store";
import { useLoginModalStore } from "@/features/auth/model/login-modal-store";
import { uploadIntentStorage } from "@/shared/storage";

interface UploadModalState {
  /** 업로드 모달 열림 여부 */
  open: boolean;
  /**
   * 비로그인 게이트가 로그인 모달을 열어둔 업로드 의도 (MSG-352 C10·C11) —
   * 로그인 성공 시 위저드를 이어서 열고, 로그인 없이 모달이 닫히면 해제된다.
   * 카카오 OAuth 리다이렉트는 페이지를 떠나므로 sessionStorage(uploadIntentStorage)에
   * 함께 영속화하고, 새 로드가 저장값으로 초기화(hydrate)해 이어받는다(C11).
   */
  pendingAfterLogin: boolean;
  /**
   * 지목 격자 좌표 (격자 고정 진입) — 격자 상세의 [영상 추가]가 넘긴 격자 중심.
   * null이면 일반 진입(FAB·사이드레일)이라 지도 뷰포트 중심을 쓴다(use-upload-location).
   * 업로드 의도와 함께 sessionStorage에 영속화돼 카카오 리다이렉트(새 로드)도 생존한다 —
   * 지목 격자가 조용히 뷰포트 중심으로 바뀌어 다른 위치에 게시되는 경로 봉쇄.
   */
  target: LatLng | null;
  /**
   * 교체 대상 영상 (MSG-415) — null이면 일반 업로드 모드. 내 영상 더보기 메뉴의
   * [영상 교체]가 세팅하고, 위저드 확정이 POST 대신 PUT /api/videos/{videoId}로 간다.
   * zoneName·zoneCell은 교체 모드 위치 라벨(추정 1 — 좌표 미전송이라 지도 중심 대신
   * 대상 격자 라벨 표기)용. 영속화하지 않는다 — 교체 진입점은 로그인 후 표면이라
   * pendingAfterLogin(카카오 리다이렉트 재개) 경로와 무관하다.
   */
  replaceTarget: ReplaceTarget | null;
  /** 업로드 진입 — 비로그인이면 위저드 대신 로그인 모달을 연다 (MSG-352 C9). target은 지목 격자 */
  openModal: (target?: LatLng) => void;
  /** 교체 진입 (MSG-415) — mine 전용 표면이라 로그인 게이트 불요. 지목 격자(target)는 쓰지 않는다 */
  openReplaceModal: (target: ReplaceTarget) => void;
  closeModal: () => void;
}

/** 교체 대상 — 진입점(VideoActionTarget)이 가진 값의 부분집합 */
export interface ReplaceTarget {
  videoId: number;
  /** 성공 시 격자 쿼리 무효화 대상 — 미확보면 null(광역 무효화) */
  gridId: string | null;
  zoneName: string | null;
  zoneCell: string | null;
}

/**
 * 업로드 모달 열림 상태 — 전역 UI 플래그. [Q1]
 * 두 진입점(사이드레일=AppLayout, 지도 FAB=MapShell)이 위젯 경계를 넘어 같은 모달을
 * 열어야 하므로 로컬 state 리프팅 대신 전역 스토어로 둔다(sidebar-store 선례).
 * 비로그인 게이트(MSG-352 C9)는 진입점별 분기 대신 열기 액션에 둔다 — 모든 진입점
 * (및 이후 추가되는 진입점)에 자동 적용된다. 게이트 경로에서 로그인에 성공하면
 * 위저드를 자동 재개한다(C10, 아래 구독) — 결합은 upload→auth 단방향(순환 없음).
 * 라우터를 참조하지 않는다 — 네비게이션이 아니라 오버레이 토글이다(RN 경계).
 */
export const useUploadModalStore = create<UploadModalState>((set) => ({
  open: false,
  // C11: 카카오 콜백 복귀(새 로드)가 게이트 시점의 영속 의도를 이어받는다 — 로드 시점에
  // hydrate해 두면 아래 전이 구독이 dev 로그인(같은 세션 메모리)과 같은 코드로 재개한다.
  // 전이 시 스토리지를 직접 조회하지 않는 이유: 같은 세션의 테스트·리셋이 남긴 저장값이
  // 메모리 상태와 무관하게 재개를 일으키는 경로(스퓨리어스 재개)를 봉쇄하기 위함이다
  pendingAfterLogin: uploadIntentStorage.peek(),
  // C11 hydrate — 영속 의도의 지목 좌표도 함께 복원한다 (리다이렉트 복귀 재개가 격자 고정을 잇는다)
  target: uploadIntentStorage.peekTarget(),
  replaceTarget: null,
  openModal: (target) => {
    if (!useAuthStore.getState().isAuthenticated) {
      // 로그인 모달을 먼저 연다 — "모달 열림 = 이전 의도 무효" 구독(아래 stale 가드)이
      // 잔존 의도를 청소한 뒤에 이번 의도를 세팅해야 게이트의 의도가 지워지지 않는다.
      // 지목 격자도 함께 보존해 재개(C10)가 격자 고정 진입을 잇는다
      useLoginModalStore.getState().openModal();
      set({ pendingAfterLogin: true, target: target ?? null });
      uploadIntentStorage.save(target); // C11: 카카오 리다이렉트 생존용 영속화 (지목 좌표 포함)
      return;
    }
    // 매 진입마다 지목·교체 대상을 명시 세팅한다 — 일반 진입이 직전 교체 모드를 이어받는 경로 차단 (AC 6)
    set({ open: true, target: target ?? null, replaceTarget: null });
  },
  openReplaceModal: (replaceTarget) =>
    // 지목 격자(target)는 세팅하지 않는다 — 교체는 좌표 미전송(격자 유지, 추정 1)
    set({ open: true, target: null, replaceTarget }),
  closeModal: () => set({ open: false, target: null, replaceTarget: null }),
}));

// C10·C11: 비로그인→로그인 전이 시 보류된 업로드 의도를 재개 — 로그인 모달을 닫고
// 위저드를 이어서 연다. dev 로그인의 훅 레벨 onSuccess(setAccessToken)가 패널의
// closeModal보다 먼저 실행되므로(TanStack Query 순서 보장) 재개가 취소 해제보다 앞선다.
// 카카오 경로는 콜백 새 로드의 hydrate 값이 같은 조건을 충족한다. 재개된 의도는
// 소진한다(clear) — 이후 세션의 무관한 로그인이 위저드를 또 열지 않게 한다.
useAuthStore.subscribe((state, prev) => {
  if (!state.isAuthenticated || prev.isAuthenticated) return;
  if (!useUploadModalStore.getState().pendingAfterLogin) return;
  useLoginModalStore.getState().closeModal();
  useUploadModalStore.setState({ pendingAfterLogin: false, open: true });
  uploadIntentStorage.clear();
});

// C10·C11: 로그인 없이 로그인 모달이 닫히면(취소) 업로드 의도를 메모리·영속 모두 해제 —
// 이후 프로필 등 다른 경로의 로그인이 위저드를 열지 않게 한다. 재개 경로의 closeModal은
// 이미 로그인 상태라 이 구독을 통과하지 않고, 카카오 리다이렉트 이탈은 모달 닫힘
// 이벤트 자체가 없어 취소로 처리되지 않는다(의도가 생존해야 하는 경로).
useLoginModalStore.subscribe((state, prev) => {
  if (state.open || !prev.open) return;
  if (useAuthStore.getState().isAuthenticated) return;
  useUploadModalStore.setState({ pendingAfterLogin: false });
  uploadIntentStorage.clear();
});

// C11 stale 가드: 로그인 모달이 "열리는" 순간 이전(하이드레이트된) 의도를 해제한다.
// 의도 세팅 후 로그인 없이 이탈·복귀한 세션의 잔존 의도는 hydrate로 되살아나는데,
// 앱의 모든 로그인 경로(카카오·dev)는 로그인 모달을 거치므로 다음 로그인이 일어나기
// 전에 여기서 소거된다. 정당한 카카오 재개 경로(게이트→리다이렉트→콜백 로그인)는
// 그 사이 모달을 다시 열지 않아 이 가드를 지나지 않고, 게이트 자신은 모달을 먼저 연
// 뒤 의도를 세팅하므로(openModal의 호출 순서) 이 청소에 지워지지 않는다.
useLoginModalStore.subscribe((state, prev) => {
  if (!state.open || prev.open) return;
  useUploadModalStore.setState({ pendingAfterLogin: false });
  uploadIntentStorage.clear();
});
