import type { Metadata } from "next";
import { AuthPage } from "../auth-page";

export const metadata: Metadata = {
  title: "Create an account — Atelier",
};

export default function SignUpPage({ searchParams }: PageProps<"/sign-up">) {
  return (
    <AuthPage
      mode="sign-up"
      title="Create an account"
      intro="An Atelier account keeps your details in one place."
      searchParams={searchParams}
    />
  );
}
