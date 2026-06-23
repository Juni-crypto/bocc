import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "../AuthForm";

export const metadata: Metadata = {
  title: "Sign up · BOCC",
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh]" />}>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
