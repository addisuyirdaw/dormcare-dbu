'use client';

import { usePathname } from 'next/navigation';
import AIAssistantWidget from '@/components/AIAssistantWidget';

/** Renders the AI widget everywhere EXCEPT the login page. */
export default function AIAssistantGate() {
  const pathname = usePathname();
  if (pathname === '/login') return null;
  return <AIAssistantWidget />;
}
