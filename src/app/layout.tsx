import type { Metadata } from 'next';
import './globals.css';
import AIAssistantWidget from '@/components/AIAssistantWidget';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'DBU Dormitory Management System',
  description:
    'Debre Birhan University — Digital dormitory operations: emergency tickets, gate clearance, attendance tracking, and staff accountability.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <div style={{ flex: 1 }}>
            {children}
          </div>
          <Footer />
        </div>
        <AIAssistantWidget />
      </body>
    </html>
  );
}
