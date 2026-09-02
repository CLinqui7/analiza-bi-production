import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { BusinessLineThemeProvider } from "@/components/business-line-theme-provider";
import "./globals.css";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Analiza Intelligence",
  description:
    "Business Intelligence corporativo para operaciones de Analiza en Centroamerica.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <BusinessLineThemeProvider>
            {children}
          </BusinessLineThemeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
