import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blog Fut",
  description: "Matérias de futebol produzidas pelo Squad Fut.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
