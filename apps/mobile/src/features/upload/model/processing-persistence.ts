import AsyncStorage from "@react-native-async-storage/async-storage";
import { createPendingVideoStorage } from "./pending-video-storage";
import { createProcessingStore } from "./processing-store";

/**
 * 처리 대기 스토어 영속 배선 (MSG-429 기준 8) — 순수 스토어·저장소 모델에 AsyncStorage를
 * 주입한다. 네이티브 모듈을 만지는 유일한 지점이라 판정 로직을 두지 않는다
 * (`upload-flow-persistence.ts` 선례).
 */
export const processingStore = createProcessingStore(
  createPendingVideoStorage(AsyncStorage),
);
