import { useSyncExternalStore } from "react";
import { getBrowserPlatform, isMacPlatform } from "@/lib/keyboard-shortcuts";

function subscribe(): () => void {
  // The platform never changes while the page is open.
  return () => {};
}

function getSnapshot(): boolean {
  return isMacPlatform(getBrowserPlatform());
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * True when the viewer is on a Mac. The server render (and hydration) assume a PC,
 * then the client switches to Mac labels, so the markup never mismatches.
 */
export function useIsMacPlatform(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
