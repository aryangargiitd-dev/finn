import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "FINN — Investment intelligence",
  description:
    "From market noise to investment intelligence. Source-grounded research for Indian public markets.",
  icons: { icon: "/favicon.svg" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
