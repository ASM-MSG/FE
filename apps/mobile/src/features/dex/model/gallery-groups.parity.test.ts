import { describe, expect, it } from "vitest";
import type {
  CollectedVideo,
  GalleryGridGroup,
} from "../../../entities/dex/model/dex";
import { groupVideosByGrid } from "./gallery-groups";

/**
 * L5 parity: 모바일 `gallery-groups` ↔ 웹 `features/dex/model/gallery-groups.ts`
 * 동등성 (티켓 포팅 슬롯 "gallery"). 웹 원본은 `@/features/region/model/grid-card`를
 * 값으로 import하므로 모바일 vitest.config의 "@" → 웹 src 별칭(parity 전용)이 전제다.
 * 웹 파일이 이동·삭제되면 이 테스트가 깨진다(의도된 드리프트 감지).
 */
interface WebGalleryGroupsModule {
  groupVideosByGrid: (
    videos: CollectedVideo[],
    regionName: string,
  ) => GalleryGridGroup[];
}

const WEB_GALLERY_GROUPS_PATH = new URL(
  "../../../../../web/src/features/dex/model/gallery-groups.ts",
  import.meta.url,
).pathname;

const loadWebGalleryGroups = (): Promise<WebGalleryGroupsModule> =>
  import(WEB_GALLERY_GROUPS_PATH);

/** 픽스처 — 3격자·7영상, createdAt 동률 1쌍, zoneName null 1격자 */
const VIDEOS: CollectedVideo[] = [
  {
    videoId: 11,
    gridId: "39064_112221",
    durationSec: 47,
    createdAt: "2026-08-19T10:00:00+09:00",
    thumbnailUrl: "https://example.test/a.jpg",
    zoneName: "서면",
    zoneCell: "A-02",
  },
  {
    videoId: 4,
    gridId: "39064_112221",
    durationSec: 30,
    createdAt: "2026-08-18T10:00:00+09:00",
    thumbnailUrl: null,
    zoneName: "서면",
    zoneCell: "A-02",
  },
  {
    videoId: 7,
    gridId: "39064_112221",
    durationSec: 12,
    createdAt: "2026-08-18T10:00:00+09:00",
    thumbnailUrl: null,
    zoneName: "서면",
    zoneCell: "A-02",
  },
  {
    videoId: 21,
    gridId: "39064_112222",
    durationSec: 25,
    createdAt: "2026-08-19T12:00:00+09:00",
    thumbnailUrl: null,
    zoneName: "서면",
    zoneCell: "A-04",
  },
  {
    videoId: 22,
    gridId: "39064_112222",
    durationSec: 25,
    createdAt: "2026-08-15T12:00:00+09:00",
    thumbnailUrl: null,
    zoneName: "서면",
    zoneCell: "A-04",
  },
  {
    videoId: 31,
    gridId: "39065_112221",
    durationSec: 8,
    createdAt: "2026-08-19T12:00:00+09:00",
    thumbnailUrl: null,
    zoneName: null,
    zoneCell: null,
  },
  {
    videoId: 32,
    gridId: "39065_112221",
    durationSec: 9,
    createdAt: "2026-08-10T12:00:00+09:00",
    thumbnailUrl: null,
    zoneName: null,
    zoneCell: null,
  },
];

describe("gallery-groups 동등성 (L5)", () => {
  it("그룹 순서·그룹 내 순서·라벨이 웹 원본과 전체 배열 단위로 동일하다 (L5)", async () => {
    const web = await loadWebGalleryGroups();

    expect(groupVideosByGrid(VIDEOS, "부전2동")).toEqual(
      web.groupVideosByGrid(VIDEOS, "부전2동"),
    );
  });

  it("영상이 없는 입력에서도 웹 원본과 동일하다 (L5 경계)", async () => {
    const web = await loadWebGalleryGroups();

    expect(groupVideosByGrid([], "부전2동")).toEqual(
      web.groupVideosByGrid([], "부전2동"),
    );
  });
});
