import type { Metadata } from "next";
import { AddView } from "./AddView";

export const metadata: Metadata = {
  title: "Add photos · BOCC",
};

export default async function AddPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <AddView slug={slug} />;
}
