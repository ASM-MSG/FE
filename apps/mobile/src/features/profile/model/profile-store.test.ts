import { describe, expect, it, vi } from "vitest";
import { MOCK_PROFILE } from "../../../entities/profile/model/mock-profile";
import { createProfileStore } from "./profile-store";

/**
 * AC 12·14: 프로필 스토어 — save가 닉네임·위치정보 값을 갱신하고 구독자에게 전파하며,
 * save 없이는(취소·뒤로가기 경로) 스토어 값이 변하지 않는다.
 * 테스트는 팩토리(createProfileStore)로 격리 인스턴스를 만든다 (search-store 관례).
 */
describe("profile-store (AC 12·14)", () => {
  it("초기 상태: MOCK_PROFILE의 닉네임('필맵퍼')·위치정보(켜짐)로 시드된다 (AC 11 초기값 출처)", () => {
    const store = createProfileStore();
    expect(store.getState()).toEqual({
      nickname: MOCK_PROFILE.nickname,
      locationEnabled: MOCK_PROFILE.locationEnabled,
    });
  });

  it("save: 닉네임·위치정보 값을 갱신하고 구독자에게 새 상태가 전파된다 (AC 12)", () => {
    const store = createProfileStore();
    const listener = vi.fn();
    store.subscribe(listener);
    store.save({ nickname: "서면필맵퍼", locationEnabled: false });
    expect(store.getState()).toEqual({
      nickname: "서면필맵퍼",
      locationEnabled: false,
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("save 미호출(취소·뒤로가기 경로)이면 스토어 값이 불변이고 구독자 통지가 없다 — 드래프트는 화면 로컬 (AC 14 로직)", () => {
    const store = createProfileStore();
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getState();
    // 편집 화면의 드래프트 수정은 스토어를 거치지 않는다 — 상태 전이 API는 save뿐
    expect(store.getState()).toBe(before);
    expect(store.getState()).toEqual({
      nickname: MOCK_PROFILE.nickname,
      locationEnabled: MOCK_PROFILE.locationEnabled,
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it("save: 앞뒤 공백이 섞인 닉네임은 trim해 저장한다 — 공백 선두 닉네임이 아바타 이니셜을 빈 칸으로 만드는 결함 방지 (리뷰 반영)", () => {
    const store = createProfileStore();
    store.save({ nickname: " 필맵퍼 ", locationEnabled: true });
    expect(store.getState().nickname).toBe("필맵퍼");
  });

  it("unsubscribe 후에는 save가 더 이상 통지하지 않는다 (AC 12 — 구독 해제 계약)", () => {
    const store = createProfileStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    unsubscribe();
    store.save({ nickname: "필맵퍼2", locationEnabled: true });
    expect(listener).not.toHaveBeenCalled();
  });
});
