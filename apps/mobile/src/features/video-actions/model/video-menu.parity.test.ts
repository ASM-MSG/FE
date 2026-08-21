import { describe, expect, it } from "vitest";
import * as mobile from "./video-menu";

/**
 * L5 parity: 모바일 `video-menu` ↔ 웹 `features/video-actions/model/video-menu.ts` 동등성.
 * 공개 범위 옵션·전환 판정·삭제 확인 카드 문구가 갈리면 같은 영상이 플랫폼별로 다르게
 * 보이거나 다르게 저장된다. 웹 파일이 이동·삭제되면 이 테스트가 깨진다(의도된 드리프트 감지).
 *
 * 웹 원본은 변수 경로 동적 import로 로드한다 — 정적 import를 쓰지 않는 이유는
 * grid.parity.test.ts와 동일하다(웹 내부의 "@/…" 별칭이 모바일 typecheck를 깬다).
 * 웹의 `toPlaybackFeedVideo`는 포팅 대상이 아니라 대조하지 않는다 — map-home의 `FeedVideo`
 * 계약에 결합돼 있고 모바일에는 그 계약도 재생 화면도 없다(스펙 신규 파일 표).
 */
interface WebVideoMenuModule {
  VISIBILITY_OPTIONS: typeof mobile.VISIBILITY_OPTIONS;
  visibilityLabel: typeof mobile.visibilityLabel;
  shouldPatchVisibility: typeof mobile.shouldPatchVisibility;
  videoCardLabel: typeof mobile.videoCardLabel;
  deleteCardTitle: typeof mobile.deleteCardTitle;
  deleteCardMeta: typeof mobile.deleteCardMeta;
}

const WEB_VIDEO_MENU_PATH = new URL(
  "../../../../../web/src/features/video-actions/model/video-menu.ts",
  import.meta.url,
).pathname;

const loadWebVideoMenu = (): Promise<WebVideoMenuModule> =>
  import(WEB_VIDEO_MENU_PATH);

const NOW = new Date("2026-08-19T12:00:00+09:00");

describe("video-menu 동등성 (L5)", () => {
  it("공개 범위 옵션 목록이 웹 원본과 값·순서까지 같다 (L5)", async () => {
    const web = await loadWebVideoMenu();

    expect(mobile.VISIBILITY_OPTIONS).toEqual(web.VISIBILITY_OPTIONS);
  });

  it("공개 범위 라벨이 4개 입력(PUBLIC·PRIVATE·FRIENDS·null)에서 웹과 같다 (L5)", async () => {
    const web = await loadWebVideoMenu();

    for (const value of ["PUBLIC", "PRIVATE", "FRIENDS", null]) {
      expect(mobile.visibilityLabel(value)).toBe(web.visibilityLabel(value));
    }
  });

  it("전환 발사 판정이 현재값 4종 × 선택 2종 전건에서 웹과 같다 (L5)", async () => {
    const web = await loadWebVideoMenu();

    for (const current of ["PUBLIC", "PRIVATE", "FRIENDS", null]) {
      for (const next of ["PUBLIC", "PRIVATE"] as const) {
        expect(mobile.shouldPatchVisibility(current, next)).toBe(
          web.shouldPatchVisibility(current, next),
        );
      }
    }
  });

  it("격자 라벨 폴백이 구역 안·구역 밖·무귀속 3건에서 웹과 같다 (L5)", async () => {
    const web = await loadWebVideoMenu();
    const samples: Array<[string | null, string | null, string | null]> = [
      ["서면", "A-02", "부전2동"],
      [null, null, "부전2동"],
      [null, null, null],
    ];

    for (const [zoneName, zoneCell, regionName] of samples) {
      expect(mobile.videoCardLabel(zoneName, zoneCell, regionName)).toBe(
        web.videoCardLabel(zoneName, zoneCell, regionName),
      );
    }
  });

  it("삭제 확인 카드 2줄이 라벨·공개 상태 유무 4조합에서 웹과 같다 (L5)", async () => {
    const web = await loadWebVideoMenu();
    const createdAt = "2026-08-16T12:00:00+09:00";

    for (const label of ["서면 A-02", null]) {
      expect(mobile.deleteCardTitle(label, 84)).toBe(
        web.deleteCardTitle(label, 84),
      );
    }
    for (const visibility of ["PUBLIC", "PRIVATE", "FRIENDS", null]) {
      expect(mobile.deleteCardMeta(createdAt, visibility, NOW)).toBe(
        web.deleteCardMeta(createdAt, visibility, NOW),
      );
    }
  });
});
