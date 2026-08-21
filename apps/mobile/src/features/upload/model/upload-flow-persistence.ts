import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  resumeRouteForFlow,
  type UploadResumeRoute,
} from "./upload-flow-resume";
import { createUploadFlowStorage } from "./upload-flow-storage";
import { isEmptyUploadFlow, uploadFlowStore } from "./upload-flow-store";

/**
 * 업로드 진행 상태 영속 배선 (기준 36·38·39) — 순수 저장소 모델
 * (`upload-flow-storage.ts`)에 AsyncStorage를 주입하고 스토어와 잇는다.
 * 네이티브 모듈을 만지는 유일한 지점이라 이 파일에는 판정 로직을 두지 않는다.
 *
 * **재수화 게이트(기준 38)**: AsyncStorage는 비동기라 복원 전에 화면을 렌더하면
 * "선택 없음" 상태가 한 프레임 보였다가 복원값으로 튄다. token-storage의 `hydrated`
 * 게이트 패턴을 그대로 써서 복원 완료 전에는 플로우 화면을 렌더하지 않는다.
 */
const storage = createUploadFlowStorage(AsyncStorage);

let hydration: Promise<void> | null = null;
let persisting = false;

/** 재수화가 끝난 뒤에만 구독한다 — hydrate 자체가 저장을 유발하지 않게 */
const startPersisting = () => {
  if (persisting) return;
  persisting = true;
  uploadFlowStore.subscribe(() => {
    if (isEmptyUploadFlow(uploadFlowStore.getState())) {
      void storage.clear();
      return;
    }
    void storage.save(uploadFlowStore.toPersisted());
  });
};

/** 앱 수명당 1회 재수화 — 화면 여러 개가 불러도 같은 프라미스를 공유한다 */
export const ensureUploadFlowHydrated = (): Promise<void> =>
  (hydration ??= storage.load().then((persisted) => {
    uploadFlowStore.hydrate(persisted);
    startPersisting();
  }));

/**
 * 콜드 스타트 시 이어갈 업로드 화면 — 없으면 null (기준 36).
 * 앱 진입점(`app/index.tsx`)이 스플래시를 내리기 전에 호출해 복귀 라우트를 정한다.
 * 재수화를 함께 기다리므로 이동한 화면이 초기 상태를 한 프레임 보이는 일이 없다(R6).
 */
export const resolveUploadResumeRoute =
  async (): Promise<UploadResumeRoute | null> => {
    await ensureUploadFlowHydrated();
    return resumeRouteForFlow(uploadFlowStore.toPersisted());
  };

/** 복원 완료 여부 — false 동안 플로우 화면은 렌더하지 않는다 (기준 38) */
export const useUploadFlowHydrated = (): boolean => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    void ensureUploadFlowHydrated().then(() => {
      if (alive) setHydrated(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return hydrated;
};
