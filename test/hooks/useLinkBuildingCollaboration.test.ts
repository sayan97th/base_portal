/**
 * Tests for the server broadcasts the Link Building Orders collaboration hook
 * hands to the table: row updates, and the single "bulk changed" event a large
 * history restore sends instead of one event per row.
 */

import { renderHook } from "@testing-library/react";
import { useLinkBuildingCollaboration } from "@/hooks/useLinkBuildingCollaboration";

type Listener = (data: unknown) => void;

interface FakeChannel {
  here: jest.Mock;
  joining: jest.Mock;
  leaving: jest.Mock;
  listenForWhisper: jest.Mock;
  whisper: jest.Mock;
  listen: (event: string, callback: Listener) => FakeChannel;
}

// Presence channel fake: keeps the listener of every server event by name.
const mockListeners = new Map<string, Listener>();
const mockChannel: FakeChannel = {
  here: jest.fn().mockReturnThis(),
  joining: jest.fn().mockReturnThis(),
  leaving: jest.fn().mockReturnThis(),
  listenForWhisper: jest.fn().mockReturnThis(),
  whisper: jest.fn(),
  listen: jest.fn((event: string, callback: Listener): FakeChannel => {
    mockListeners.set(event, callback);
    return mockChannel;
  }),
};

jest.mock("@/lib/api-client", () => ({
  getToken: () => "token",
}));

jest.mock("@/lib/echo", () => ({
  setEchoSessionId: jest.fn(),
  getEcho: () => ({
    connector: { pusher: { connection: { state: "connected", bind: jest.fn(), unbind: jest.fn() } } },
    join: () => mockChannel,
    leave: jest.fn(),
  }),
}));

function renderCollaboration(overrides: Partial<Parameters<typeof useLinkBuildingCollaboration>[0]> = {}) {
  const options = {
    current_user_id: 1,
    current_user_name: "Krista B",
    current_user_avatar: null,
    onRowUpdated: jest.fn(),
    onRowCreated: jest.fn(),
    onRowDeleted: jest.fn(),
    onBulkChanged: jest.fn(),
    ...overrides,
  };
  renderHook(() => useLinkBuildingCollaboration(options));
  return options;
}

beforeEach(() => {
  mockListeners.clear();
  jest.clearAllMocks();
});

it("passes a large change broadcast to the table with the session that made it", () => {
  const { onBulkChanged } = renderCollaboration();

  mockListeners.get(".LinkBuildingOrdersBulkChanged")!({ changed_by_session_id: "other-tab", row_count: 30000 });

  expect(onBulkChanged).toHaveBeenCalledWith("other-tab");
});

it("ignores a large change broadcast when the table does not handle it", () => {
  renderCollaboration({ onBulkChanged: undefined });

  expect(() => mockListeners.get(".LinkBuildingOrdersBulkChanged")!({ changed_by_session_id: "x", row_count: 1 })).not.toThrow();
});

it("still passes single row updates on", () => {
  const { onRowUpdated } = renderCollaboration();
  const row = { id: "uuid-1" };

  mockListeners.get(".LinkBuildingOrderUpdated")!({ row, updated_by_session_id: "other-tab" });

  expect(onRowUpdated).toHaveBeenCalledWith(row, "other-tab");
});
