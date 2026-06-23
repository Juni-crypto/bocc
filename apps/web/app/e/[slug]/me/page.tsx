import type { Metadata } from "next";
import { MeView } from "./MeView";

export const metadata: Metadata = {
  title: "Find me · BOCC",
};

export default async function MePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <MeView slug={slug} />;
}
