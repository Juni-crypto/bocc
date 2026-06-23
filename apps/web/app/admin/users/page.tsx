import type { Metadata } from "next";
import { AdminUsersView } from "./AdminUsersView";

export const metadata: Metadata = {
  title: "Users · Admin · BOCC",
};

export default function AdminUsersPage() {
  return <AdminUsersView />;
}
