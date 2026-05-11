import type { Metadata } from "next";
import React from "react";
import AcceptClientInvitationForm from "@/components/auth/AcceptClientInvitationForm";

export const metadata: Metadata = {
  title: "Accept Invitation | BASE Search Marketing",
  description: "Set up your client account",
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function AcceptClientInvitationPage({ params }: Props) {
  const { token } = await params;
  return <AcceptClientInvitationForm token={token} />;
}
