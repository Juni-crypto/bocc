import type { Metadata } from "next";
import { AdminEventsView } from "./AdminEventsView";

export const metadata: Metadata = {
  title: "Events · Admin · BOCC",
};

export default function AdminEventsPage() {
  return <AdminEventsView />;
}
