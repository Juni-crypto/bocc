import type { Metadata } from "next";
import { PersonView } from "./PersonView";

export const metadata: Metadata = {
  title: "Person · Gallery · BOCC",
};

export default async function PersonPage({
  params,
}: {
  params: Promise<{ slug: string; personId: string }>;
}) {
  const { slug, personId } = await params;
  return <PersonView slug={slug} personId={personId} />;
}
