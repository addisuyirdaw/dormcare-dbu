import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DBU Dormitory Management System',
  description: 'Debre Birhan University — Digital dormitory operations: emergency tickets, gate clearance, attendance tracking, and staff accountability.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
