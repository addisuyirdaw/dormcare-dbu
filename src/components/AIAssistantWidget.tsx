'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
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
  const pathname = usePathname();
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
    if (msg.sender === 'user') return 'bot-msg-user';
    if (msg.tone === 'critical') return 'bot-msg-critical';
    return 'bot-msg-ai';
  };

  const markdownClass = (msg: Message) =>
    msg.tone === 'critical' ? 'bot-md bot-md-critical' : 'bot-md bot-md-normal';

  // Ensure it renders everywhere
  // if (pathname === '/login') return null;

  return (
    <>
      <style>{`
        .bot-trigger {
          position: fixed; bottom: 32px; right: 32px; z-index: 999999;
          display: flex; align-items: center; gap: 12px;
          background: linear-gradient(135deg, #2563eb, #4f46e5);
          color: #fff; padding: 14px 24px; border-radius: 999px;
          font-weight: 700; border: none; cursor: pointer;
          box-shadow: 0 10px 30px rgba(37,99,235,0.6);
          transition: transform 0.2s, box-shadow 0.2s;
          font-family: system-ui, sans-serif;
        }
        .bot-trigger:hover {
          transform: scale(1.05);
          box-shadow: 0 12px 40px rgba(37,99,235,0.7);
        }
        .bot-panel {
          position: fixed; bottom: 24px; right: 24px; z-index: 999999;
          width: 420px; height: 600px; max-width: calc(100vw - 48px); max-height: calc(100vh - 48px);
          display: flex; flex-direction: column;
          background: #0f172a; border: 1px solid #334155;
          border-radius: 16px; overflow: hidden;
          box-shadow: 0 24px 64px rgba(0,0,0,0.7);
          font-family: system-ui, sans-serif; color: #f1f5f9;
        }
        .bot-header {
          background: #2563eb; padding: 16px;
          display: flex; justify-content: space-between; align-items: center;
          font-weight: 700; flex-shrink: 0;
        }
        .bot-messages {
          flex: 1; overflow-y: auto; padding: 16px;
          display: flex; flex-direction: column; gap: 16px;
          background: #020617;
        }
        .bot-msg-user {
          align-self: flex-end; background: #2563eb; color: #fff;
          padding: 12px 16px; border-radius: 16px 16px 4px 16px;
          max-width: 88%; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .bot-msg-ai {
          align-self: flex-start; background: #ffffff; color: #1e293b;
          padding: 12px 16px; border-radius: 16px 16px 16px 4px;
          max-width: 85%; font-size: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }
        .bot-msg-critical {
          align-self: flex-start; background: #450a0a; color: #fef2f2;
          border: 2px solid rgba(239,68,68,0.8);
          padding: 12px 16px; border-radius: 16px 16px 16px 4px;
          max-width: 92%; font-size: 14px;
          box-shadow: 0 0 20px rgba(239,68,68,0.35);
        }
        .bot-footer {
          padding: 16px; background: #0f172a; border-top: 1px solid #1e293b;
          flex-shrink: 0;
        }
        .bot-input-group { display: flex; gap: 8px; margin-top: 12px;}
        .bot-input {
          flex: 1; padding: 10px 16px; border-radius: 8px;
          background: #020617; border: 1px solid #334155; color: #fff; font-size: 14px;
        }
        .bot-input:focus { outline: none; border-color: #3b82f6; }
        .bot-send {
          background: #2563eb; color: #fff; border: none; padding: 10px 16px;
          border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 14px;
        }
        .bot-send:disabled { opacity: 0.5; cursor: not-allowed; }
        .bot-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
        .bot-chip {
          background: #1e293b; color: #cbd5e1; border: 1px solid #334155;
          padding: 4px 10px; border-radius: 99px; font-size: 11px; cursor: pointer;
        }
        .bot-chip-critical {
          background: rgba(69,10,10,0.8); border-color: rgba(220,38,38,0.6); color: #fecaca;
        }
        .bot-chip-warn {
          background: rgba(69,26,0,0.8); border-color: rgba(217,119,6,0.6); color: #fde68a;
        }
        .bot-md p { margin-top: 4px; margin-bottom: 4px; }
        .bot-md-normal strong { color: #1d4ed8; }
        .bot-md-critical strong { color: #fca5a5; }
      `}</style>

      {!isOpen ? (
        <button type="button" onClick={() => setIsOpen(true)} className="bot-trigger" aria-label="Open DormCare Assistant">
          <span style={{ fontSize: '28px' }}>🤖</span>
          <span style={{ fontSize: '16px', letterSpacing: '0.5px' }}>Ask DormCare AI</span>
        </button>
      ) : (
        <div className="bot-panel">
          <div className="bot-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ fontSize: '24px' }}>🤖</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '16px' }}>DormCare Assistant</span>
                <span style={{ fontSize: '12px', color: '#fecaca', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', boxShadow: '0 0 8px red' }}></span>
                  Live · ICS Ready
                </span>
              </div>
            </div>
            <button type="button" onClick={() => setIsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>

          <div className="bot-messages">
            {messages.map((msg) => (
              <div key={msg.id} style={{ display: 'flex', width: '100%', justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
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
              <div style={{ display: 'flex', width: '100%', justifyContent: 'flex-start' }}>
                <div style={{ padding: '8px 12px', background: 'rgba(69,10,10,0.8)', border: '1px solid rgba(153,27,27,0.6)', color: '#fecaca', borderRadius: '12px', fontSize: '12px' }}>
                  Executing incident playbook…
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="bot-footer">
            {verifiedStudentId && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="bot-chips">
                  <button type="button" disabled={isLoading} onClick={() => handleCrisisChip('🚨 Water Main Burst (Trigger Alarm)', 'water')} className="bot-chip bot-chip-critical">🚨 Water Main Burst (Trigger Alarm)</button>
                  <button type="button" disabled={isLoading} onClick={() => handleCrisisChip('🔌 Total Block Blackout (Initiate Call)', 'blackout')} className="bot-chip bot-chip-warn">🔌 Total Block Blackout (Initiate Call)</button>
                  <button type="button" disabled={isLoading} onClick={() => handleCrisisChip('📋 System Health Dashboard', 'dashboard')} className="bot-chip">📋 System Health Dashboard</button>
                </div>
                <div className="bot-chips">
                  <button type="button" disabled={isLoading} onClick={() => handleQuickReply('📋 View Assets')} className="bot-chip">📋 View Assets</button>
                  <button type="button" disabled={isLoading} onClick={() => handleQuickReply('🔧 Report Fault (AM)')} className="bot-chip">🔧 Report Fault (AM)</button>
                </div>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="bot-input-group">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={verifiedStudentId ? 'Try: flood, blackout, gate pass…' : 'Enter Student ID (e.g. DBU1500962)'}
                className="bot-input"
                disabled={isLoading}
              />
              <button type="submit" disabled={!inputMessage.trim() || isLoading} className="bot-send">Send</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
