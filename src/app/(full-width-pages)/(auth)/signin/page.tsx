import SignInForm from "@/components/auth/SignInForm";
import AuthFormSkeleton from "@/components/auth/AuthFormSkeleton";
import { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign In | BASE Search Marketing",
  description:
    "Sign in to your BASE Search Marketing client portal to manage your link building and content services.",
};

export default function SignIn() {
  return (
    <Suspense fallback={<AuthFormSkeleton show_social_button />}>
      <SignInForm />
    </Suspense>
  );
}
