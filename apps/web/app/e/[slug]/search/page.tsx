import type { Metadata } from "next";
import { SearchView } from "./SearchView";

export const metadata: Metadata = {
  title: "Search · BOCC",
};

export default async function SearchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <SearchView slug={slug} />;
}
