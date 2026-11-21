
import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import React from 'react';

export const metadata: Metadata = {
  title: 'Exact Ink',
  description: 'A tool that compares your content with final designs.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-body antialiased">
        {children}
        <Toaster />

      </body>
    </html>
  );
}
