import type { Metadata } from "next";
import { CreateForm } from "./CreateForm";

export const metadata: Metadata = {
  title: "Create an event · BOCC",
};

export default function CreatePage() {
  return <CreateForm />;
}
