import type { Metadata } from "next";
import { MyPhotosView } from "./MyPhotosView";

export const metadata: Metadata = {
  title: "My photos · BOCC",
  description:
    "Pull up every event you joined and the photos you appear in, with just your phone number.",
};

export default function MyPhotosPage() {
  return <MyPhotosView />;
}
