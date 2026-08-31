import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/features/auth/model/auth-store";
import type { EventLocationSelection } from "@/features/event/model/event-location";
import { useEventRoomStore } from "@/features/event/model/event-room-store";
import { useUploadModalStore } from "@/features/upload/model/upload-modal-store";
import { EventLocationEmptyState } from "./EventLocationEmptyState";
import { EventLocationHeader } from "./EventLocationHeader";

/**
 * 행사 업로드 진입 배선 스모크 (MSG-521 AC 1·2) — 두 버튼(빈 상태 CTA·헤더
 * [+ 영상 올리기])이 CTA 시점의 행사방·선택 위치로 업로드 모달을 여는 계약만 고정한다.
 * 위저드 내부 흐름은 upload-wizard-flow 스모크가, 게이트·모드 배타는 스토어 테스트가 커버한다.
 */
const LOCATION: EventLocationSelection = {
  locationId: 4,
  name: "광안리 피카츄 퍼레이드",
  type: "PARADE",
  operatingHours: "19:00~20:00",
  gridCount: 4,
  videoCount: 0,
};

const ROOM = {
  occurrenceId: 7,
  title: "포켓몬 메가페스타 부산",
  status: "LIVE",
} as const;

const EXPECTED_TARGET = {
  occurrenceId: 7,
  locationId: 4,
  occurrenceTitle: "포켓몬 메가페스타 부산",
  locationName: "광안리 피카츄 퍼레이드",
};

beforeEach(() => {
  useEventRoomStore.setState(useEventRoomStore.getInitialState(), true);
  useEventRoomStore.getState().open(ROOM);
  useEventRoomStore.getState().selectLocation(LOCATION);
  useUploadModalStore.setState({
    open: false,
    pendingAfterLogin: false,
    target: null,
    replaceTarget: null,
    eventTarget: null,
  });
  useAuthStore.setState({ accessToken: "token", isAuthenticated: true });
});

afterEach(() => {
  cleanup();
  useAuthStore.setState({ accessToken: null, isAuthenticated: false });
});

describe("행사 업로드 진입 배선 (MSG-521)", () => {
  it("빈 행사 위치의 '첫 영상 올리기' 클릭 시 CTA 시점의 행사방·위치로 업로드 모달이 열린다 (AC 1)", () => {
    render(<EventLocationEmptyState />);

    fireEvent.click(screen.getByRole("button", { name: "첫 영상 올리기" }));

    expect(useUploadModalStore.getState().open).toBe(true);
    expect(useUploadModalStore.getState().eventTarget).toEqual(EXPECTED_TARGET);
  });

  it("헤더의 '+ 영상 올리기'도 같은 행사 진입으로 열린다 (AC 2)", () => {
    render(<EventLocationHeader location={LOCATION} uploadVariant="primary" />);

    fireEvent.click(screen.getByRole("button", { name: "+ 영상 올리기" }));

    expect(useUploadModalStore.getState().open).toBe(true);
    expect(useUploadModalStore.getState().eventTarget).toEqual(EXPECTED_TARGET);
  });
});
