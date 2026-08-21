import { vi } from "vitest";

/**
 * 즉시 로드되는 Image 스텁 (MSG-378) — jsdom은 리소스를 실제 로드하지 않아 Radix Avatar의
 * useImageLoadingStatus가 영원히 "loading"에 머물고 이미지가 렌더되지 않는다.
 * src 대입 즉시 complete/naturalWidth를 채워 상태가 "loaded"로 판정되게 한다.
 * 아바타 이미지 src 단정이 필요한 테스트(profile-header·profile-edit-modal)가 공유한다.
 * 복원은 각 테스트의 afterEach `vi.unstubAllGlobals()` 몫.
 */
class InstantLoadImage extends EventTarget {
  referrerPolicy = "";
  crossOrigin: string | null = null;
  complete = false;
  naturalWidth = 0;
  #src = "";

  set src(value: string) {
    this.#src = value;
    this.complete = true;
    this.naturalWidth = 1;
    queueMicrotask(() => this.dispatchEvent(new Event("load")));
  }

  get src() {
    return this.#src;
  }
}

/** window.Image를 즉시 로드 스텁으로 교체한다 — Radix Avatar가 img를 실제 렌더하게 됨 */
export const stubInstantLoadImage = () => {
  vi.stubGlobal("Image", InstantLoadImage);
};
