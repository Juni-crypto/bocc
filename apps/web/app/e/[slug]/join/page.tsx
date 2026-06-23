import type { Metadata } from "next";
import { JoinView } from "./JoinView";

export const metadata: Metadata = {
  title: "Join the crew · BOCC",
};

export default async function JoinPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <JoinView slug={slug} />;
}
