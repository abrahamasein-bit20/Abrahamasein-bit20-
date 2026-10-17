import type { Metadata } from "next";
import "./globals.css";
import "./redesign.css";
import "./product-redesign.css";
import "./layout-v2.css";
import "./overhaul.css";

export const metadata: Metadata = {
  title: "iValth | Wellbeing Research Workspace",
  description: "An evidence-led research workspace for human wellbeing, concern detection, problem validation and product discovery.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
