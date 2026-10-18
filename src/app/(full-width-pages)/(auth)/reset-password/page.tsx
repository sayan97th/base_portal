import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password | BASE Search Marketing",
  description: "Reset your account password",
};

export default function ResetPasswordPage() {
  return <ForgotPasswordForm />;
}
