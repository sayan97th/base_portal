import TeamPage from "@/components/team/TeamPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Team | BASE Portal",
  description: "Manage your team members and their permissions.",
};

export default function Team() {
  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-8">
        <TeamPage />
      </div>
    </div>
  );
}
