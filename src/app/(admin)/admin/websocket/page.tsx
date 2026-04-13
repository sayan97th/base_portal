import type { Metadata } from "next";
import React from "react";
import WebSocketView from "@/components/admin/websocket/WebSocketView";

export const metadata: Metadata = {
  title: "WebSocket | BASE Admin Portal",
  description: "Interactive panel to verify and debug the Reverb WebSocket server",
};

export default function WebSocketPage() {
  return <WebSocketView />;
}
