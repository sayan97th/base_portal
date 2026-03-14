import { Metadata } from "next";
import ScheduleCallPage from "@/components/schedule-call/ScheduleCallPage";

export const metadata: Metadata = {
  title: "Schedule a Call | BASE Portal",
  description: "Schedule and manage your calls with clients and team members.",
};

export default function ScheduleACallRoute() {
  return <ScheduleCallPage />;
}
