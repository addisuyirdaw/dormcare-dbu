'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

type MessageTone = 'normal' | 'critical';

type Message = {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  tone?: MessageTone;
};

type CrisisType = 'water' | 'blackout' | 'dashboard';

const INITIAL_MESSAGE: Message = {
  id: 'init',
  sender: 'ai',
  text: '🤖 **Welcome to DormCare Assistant!**\n\nPlease enter your Student ID number to verify your residency status and access operations.',
};

const CRISIS_WATER_STEPS = [
  '🚨 **[CRITICAL ALARM]**: Audio alarm triggered on Block Supervisor Dashboard.',
  '🔧 **[AUTOMATED TICKET]**: Main valve shut-off command sent to smart plumbing relay.',
  '📲 **[DISPATCH]**: SMS dispatch sent to 3 on-call plumbers.',
];

const CRISIS_BLACKOUT_STEPS = [
  '📞 **[SYSTEM SELF-CALL]**: Twilio voice API call initiated to Debre Birhan Electric Utility Admin.',
  '⚡ **[GENERATOR TRIP]**: Standby backup generator fuel and oil levels verified.',
];

const CRISIS_DASHBOARD_STEPS = [
  '📋 **[SYSTEM HEALTH DASHBOARD]** — Live infrastructure telemetry',
  '🟢 **Dormitory Network**: ONLINE — all edge nodes responding',
  '🟡 **Smart Plumbing Relays**: STANDBY — last heartbeat 12s ago',
  '🔴 **Active Critical Incidents**: 0 open — command center nominal',
  '⚡ **Block Power Grid**: STABLE — no blackout flags in last 24h',
];

function detectCrisisType(text: string): CrisisType | null {
  const lower = text.toLowerCase();

  if (
    lower.includes('water main burst') ||
    lower.includes('trigger alarm') ||
    lower.includes('flood') ||
    lower.includes('burst') ||
    lower.includes('water main')
  ) {
    return 'water';
  }

  if (
    lower.includes('total block blackout') ||
    lower.includes('initiate call') ||
    lower.includes('blackout') ||
    lower.includes('power cut') ||
    lower.includes('power outage') ||
    lower.includes('electricity cut')
  ) {
    return 'blackout';
  }

  if (lower.includes('system health') || lower.includes('health dashboard')) {
    return 'dashboard';
  }

  return null;
}

function getCrisisSteps(type: CrisisType): string[] {
  switch (type) {
    case 'water':
      return CRISIS_WATER_STEPS;
    case 'blackout':
      return CRISIS_BLACKOUT_STEPS;
    case 'dashboard':
      return CRISIS_DASHBOARD_STEPS;
  }
}

function getCrisisLeadIn(type: CrisisType): string {
  switch (type) {
    case 'water':
      return '**INCIDENT COMMAND — WATER MAIN EMERGENCY**\nEscalation tier **CRITICAL** activated. Executing automated response playbook…';
    case 'blackout':
      return '**INCIDENT COMMAND — TOTAL BLOCK BLACKOUT**\nEscalation tier **CRITICAL** activated. Initiating utility liaison & backup power protocols…';
    case 'dashboard':
      return '**OPERATIONS CENTER** — Pulling live system health matrix for your block…';
  }
}

export default function AIAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [inputMessage, setInputMessage] = useState('');
  const [verifiedStudentId, setVerifiedStudentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isOpen]);

  const appendMessage = useCallback((msg: Omit<Message, 'id'>) => {
    setMessages((prev) => [...prev, { ...msg, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}` }]);
  }, []);

  const runCrisisWorkflow = useCallback(
    async (userLabel: string, crisisType: CrisisType) => {
      setIsLoading(true);
      appendMessage({ sender: 'user', text: userLabel });

      await new Promise((r) => setTimeout(r, 120));
      appendMessage({ sender: 'ai', text: getCrisisLeadIn(crisisType), tone: 'critical' });

      const steps = getCrisisSteps(crisisType);
      for (const step of steps) {
        await new Promise((r) => setTimeout(r, 450));
        appendMessage({ sender: 'ai', text: step, tone: 'critical' });
      }

      setIsLoading(false);
    },
    [appendMessage],
  );

  const sendToAssistant = useCallback(
    async (userText: string) => {
      const trimmed = userText.trim();
      if (!trimmed || isLoading) return;

      const crisisType = verifiedStudentId ? detectCrisisType(trimmed) : null;
      if (crisisType) {
        await runCrisisWorkflow(trimmed, crisisType);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-user`, sender: 'user', text: trimmed },
      ]);
      setIsLoading(true);

      try {
        let studentIdToUse = verifiedStudentId;
        let messageToSend = trimmed;

        if (!verifiedStudentId) {
          studentIdToUse = trimmed;
          messageToSend = '';
        }

        const res = await fetch('/api/assistant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId: studentIdToUse, message: messageToSend }),
        });

        const data = await res.json();
        const aiResponse =
          typeof data.response === 'string'
            ? data.response
            : "I'm sorry, I couldn't process that request.";

        if (
          !verifiedStudentId &&
          res.ok &&
          !aiResponse.includes('Access Denied') &&
          !aiResponse.includes('Welcome to DormCare')
        ) {
          setVerifiedStudentId(studentIdToUse);
        }

        setMessages((prev) => [
          ...prev,
          { id: `${Date.now()}-ai`, sender: 'ai', text: aiResponse },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `${Date.now()}-err`,
            sender: 'ai',
            text: '⚠️ Network error communicating with DormCare servers.',
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, verifiedStudentId, runCrisisWorkflow],
  );

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = inputMessage.trim();
    if (!text || isLoading) return;
    setInputMessage('');
    await sendToAssistant(text);
  };

  const handleQuickReply = async (text: string) => {
    if (isLoading) return;
    if (!verifiedStudentId) {
      setInputMessage(text);
      return;
    }
    await sendToAssistant(text);
  };

  const handleCrisisChip = async (label: string, type: CrisisType) => {
    if (isLoading) return;
    if (!verifiedStudentId) {
      setInputMessage(label);
      return;
    }
    await runCrisisWorkflow(label, type);
  };

  const bubbleClass = (msg: Message) => {
    if (msg.sender === 'user') {
      return 'max-w-[88%] rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-3 text-sm text-white shadow-md';
    }
    if (msg.tone === 'critical') {
      return 'max-w-[92%] rounded-2xl rounded-tl-sm border-2 border-red-500/80 bg-red-950 px-4 py-3 text-sm text-red-50 shadow-[0_0_20px_rgba(239,68,68,0.35)]';
    }
    return 'max-w-[85%] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-md';
  };

  const markdownClass = (msg: Message) =>
    msg.tone === 'critical'
      ? 'prose prose-sm max-w-none prose-p:my-1 prose-strong:text-red-300 prose-strong:font-bold text-red-50'
      : 'prose prose-sm max-w-none prose-p:my-1 prose-strong:text-blue-700 text-slate-800';

  return (
    <div className="fixed bottom-6 right-6 z-[999999] font-sans text-left text-slate-200">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Open DormCare Assistant"
          className="flex cursor-pointer items-center gap-2.5 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3.5 font-bold text-white shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-all hover:scale-105 hover:from-blue-700 hover:to-indigo-700"
        >
          <span className="text-xl leading-none">🤖</span>
          <span>Ask DormCare AI</span>
          <span className="relative ml-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
        </button>
      ) : (
        <div className="flex h-[550px] w-[380px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
          <div className="flex shrink-0 items-center justify-between bg-blue-600 p-4 font-bold text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/20 text-xl">
                🤖
              </div>
              <div className="flex flex-col">
                <span className="text-base leading-tight">DormCare Assistant</span>
                <span className="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-red-100">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                  Live · ICS Ready
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close DormCare Assistant"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-blue-100 transition-colors hover:bg-blue-700 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-1 flex-col space-y-3 overflow-y-auto bg-slate-950 p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex w-full ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={bubbleClass(msg)}>
                  {msg.sender === 'ai' ? (
                    <div className={markdownClass(msg)}>
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-red-800/60 bg-red-950/80 px-4 py-3 text-xs text-red-200">
                  <div className="flex gap-1">
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-400"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-400"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-red-400"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                  Executing incident playbook…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="shrink-0 border-t border-slate-800 bg-slate-900 p-3">
            {verifiedStudentId && (
              <div className="mb-2 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() =>
                      handleCrisisChip('🚨 Water Main Burst (Trigger Alarm)', 'water')
                    }
                    className="rounded-full border border-red-600/60 bg-red-950/80 px-2.5 py-1 text-[10px] font-semibold text-red-200 transition-colors hover:bg-red-900 hover:text-white disabled:opacity-50"
                  >
                    🚨 Water Main Burst (Trigger Alarm)
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() =>
                      handleCrisisChip('🔌 Total Block Blackout (Initiate Call)', 'blackout')
                    }
                    className="rounded-full border border-amber-600/60 bg-amber-950/80 px-2.5 py-1 text-[10px] font-semibold text-amber-100 transition-colors hover:bg-amber-900 hover:text-white disabled:opacity-50"
                  >
                    🔌 Total Block Blackout (Initiate Call)
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() =>
                      handleCrisisChip('📋 System Health Dashboard', 'dashboard')
                    }
                    className="rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-[10px] text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
                  >
                    📋 System Health Dashboard
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleQuickReply('📋 View Assets')}
                    className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
                  >
                    📋 View Assets
                  </button>
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleQuickReply('🔧 Report Fault (AM)')}
                    className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-[11px] text-slate-300 transition-colors hover:bg-slate-700 hover:text-white disabled:opacity-50"
                  >
                    🔧 Report Fault (AM)
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={
                  verifiedStudentId
                    ? 'Try: flood, blackout, gate pass…'
                    : 'Enter Student ID (e.g. DBU1500962)'
                }
                className="flex-1 rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 transition-colors placeholder:text-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
