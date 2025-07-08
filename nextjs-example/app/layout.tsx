import './globals.css';
import React from 'react';

export const metadata = {
  title: 'Alfresco SOAP API Example',
  description: 'A Next.js example app for alfresco-soap-api',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
