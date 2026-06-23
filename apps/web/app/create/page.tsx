import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { CreateForm } from "./CreateForm";

export const metadata: Metadata = {
  title: "Create an event · BOCC",
};

export default function CreatePage() {
  return (
    <AuthGate redirectTo="/create">
      <CreateForm />
    </AuthGate>
  );
}
