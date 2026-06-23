import type { Metadata } from "next";
import { AuthGate } from "@/components/AuthGate";
import { DashboardView } from "./DashboardView";

export const metadata: Metadata = {
  title: "Dashboard · BOCC",
};

export default function DashboardPage() {
  return (
    <AuthGate redirectTo="/dashboard">
      <DashboardView />
    </AuthGate>
  );
}
