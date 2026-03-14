import type { Metadata } from "next";
import React from "react";
import AcceptInvitationForm from "@/components/auth/AcceptInvitationForm";

export const metadata: Metadata = {
  title: "Accept Invitation | BASE Search Marketing",
  description: "Complete your team account setup",
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function AcceptInvitationPage({ params }: Props) {
  const { token } = await params;

  return <AcceptInvitationForm token={token} />;
}
