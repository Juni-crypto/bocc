import type { Metadata } from "next";
import { AdminOverviewView } from "./AdminOverviewView";

export const metadata: Metadata = {
  title: "Overview · Admin · BOCC",
};

export default function AdminOverviewPage() {
  return <AdminOverviewView />;
}
