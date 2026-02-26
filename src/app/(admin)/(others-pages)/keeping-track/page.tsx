import { Metadata } from "next";
import KeepingTrackPage from "@/components/keeping-track/KeepingTrackPage";

export const metadata: Metadata = {
  title: "Keeping Track | BASE Portal",
  description:
    "Monitor and manage all your scheduled call records and follow-ups.",
};

export default function KeepingTrackRoute() {
  return <KeepingTrackPage />;
}
