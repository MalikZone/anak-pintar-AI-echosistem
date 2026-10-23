import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Calendar,
  Clock,
  User,
  ExternalLink,
  ChevronRight,
  Bot,
} from 'lucide-react';
import { assistantApi } from '../../services/api/assistantApi';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';

export default function AiCopilotDrawer({ isOpen, onClose }) {
  const { user } = useAuth();
  const { t, isEn } = useLanguage();
  const toast = useToast();

  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [serviceHealth, setServiceHealth] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom();
      }, 150);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Check health on first open
  useEffect(() => {
    if (isOpen && !serviceHealth) {
      assistantApi
        .getHealth()
        .then((data) => setServiceHealth(data))
        .catch(() => setServiceHealth({ online: false }));
    }
  }, [isOpen, serviceHealth]);

  // Initial welcome message if conversation is empty
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome-0',
          sender: 'assistant',
          type: 'welcome',
          text: isEn
            ? `Hello **${user?.name || 'Staff'}**! 👋 I am your Hadirin AI Copilot.\n\nI can help you with:\n• Submitting annual or sick leave\n• Claiming overtime hours\n• Checking remaining leave balances & policies`
            : `Halo **${user?.name || 'Karyawan'}**! 👋 Saya asisten AI Hadirin.\n\nSaya bisa membantu Anda untuk:\n• Mengajukan izin cuti tahunan / sakit\n• Mengajukan klaim jam lembur\n• Cek sisa kuota cuti & aturan HR`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  }, [isOpen, messages.length, user?.name, isEn]);

  const handleSend = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await assistantApi.chat(text);
      const assistantMsg = {
        id: `ast-${Date.now()}`,
        sender: 'assistant',
        type: response.type,
        kind: response.kind,
        intent: response.intent,
        confidence: response.confidence,
        text: response.reply,
        draft: response.draft,
        sources: response.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errMsg = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        type: 'error',
        text: err?.message || (isEn ? 'Failed to process request with AI.' : 'Gagal memproses pesan dengan AI.'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmDraft = async (msgId, draftId) => {
    setActionLoadingId(draftId);
    try {
      const result = await assistantApi.confirmDraft(draftId);
      toast.success(
        isEn ? 'Request successfully submitted!' : 'Pengajuan berhasil dikirimkan!',
        isEn ? 'AI Copilot' : 'AI Asisten'
      );

      // Update message state so draft buttons are replaced by confirmed badge
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.draft?.id === draftId) {
            return {
              ...msg,
              draft: { ...msg.draft, confirmed: true },
              confirmResult: result,
            };
          }
          return msg;
        })
      );
    } catch (err) {
      toast.error(err?.message || (isEn ? 'Failed to submit draft.' : 'Gagal mengirimkan pengajuan.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancelDraft = async (msgId, draftId) => {
    setActionLoadingId(draftId);
    try {
      await assistantApi.cancelDraft(draftId);
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.draft?.id === draftId) {
            return {
              ...msg,
              draft: { ...msg.draft, cancelled: true },
            };
          }
          return msg;
        })
      );
    } catch (err) {
      toast.error(err?.message || 'Gagal membatalkan draf.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const quickPrompts = isEn
    ? [
        'How many annual leave days do I have left?',
        'I want annual leave on 24 and 25 October because of my sister’s wedding',
        'Claim 3 hours overtime tonight for deploying the application',
        'What is the company policy for sick leave?',
      ]
    : [
        'Sisa kuota cuti tahunan saya tinggal berapa hari?',
        'Saya mau izin cuti tahunan tanggal 24 dan 25 Oktober karena acara nikahan adik',
        'Lapor pak, malam ini saya lembur 3 jam buat deploy aplikasi',
        'Bagaimana aturan izin sakit di perusahaan?',
      ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 text-white shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base leading-tight">Hadirin AI Copilot</h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                  {serviceHealth?.online ? (serviceHealth?.llmProvider || 'ONLINE') : 'OFFLINE'}
                </span>
              </div>
              <p className="text-[11px] text-blue-100 leading-tight">
                {isEn ? 'Workforce Assistant • Telegram & Web Hybrid' : 'Asisten Cerdas Cuti, Lembur & Presensi Hadirin'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            title={t('btn_close', 'Tutup')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Telegram Integration Hint Banner */}
        <div className="bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs text-indigo-900 dark:text-indigo-200">
          <div className="flex items-center gap-1.5 truncate">
            <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="truncate">
              Telegram ID:{' '}
              <code className="font-mono font-bold bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                {user?.telegramId || user?.telegram_id || (isEn ? 'Not linked yet' : 'Belum ditautkan')}
              </code>
            </span>
          </div>
          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-300 shrink-0">
            {isEn ? 'Group & Private Chat Ready' : 'Grup & DM Telegram Siap'}
          </span>
        </div>

        {/* Message Viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-full`}
              >
                <div
                  className={`rounded-2xl px-4 py-3 text-sm max-w-[90%] shadow-xs whitespace-pre-wrap ${
                    isUser
                      ? 'bg-blue-600 text-white rounded-br-xs'
                      : msg.type === 'error'
                      ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 rounded-bl-xs'
                      : 'bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-800 dark:text-slate-100 rounded-bl-xs'
                  }`}
                >
                  {/* Message body */}
                  <div className="leading-relaxed">{msg.text}</div>

                  {/* Render Structured Draft Card if present */}
                  {msg.draft && msg.draft.fields && (
                    <div className="mt-3 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs shadow-xs space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          {msg.kind === 'leave'
                            ? isEn ? 'Leave Request Draft' : 'Draf Pengajuan Cuti'
                            : isEn ? 'Overtime Claim Draft' : 'Draf Pengajuan Lembur'}
                        </span>
                        {msg.confidence && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            AI {(msg.confidence * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>

                      {msg.kind === 'leave' ? (
                        <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                          <div>
                            <span className="text-slate-400 block text-[10px]">{isEn ? 'Type' : 'Jenis Cuti'}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {msg.draft.fields.typeLabel}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">{isEn ? 'Duration' : 'Durasi'}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {msg.draft.fields.totalDays} {isEn ? 'Days' : 'Hari'}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[10px]">{isEn ? 'Dates' : 'Periode Tanggal'}</span>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                              {msg.draft.fields.startDate} s/d {msg.draft.fields.endDate}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[10px]">{isEn ? 'Reason' : 'Alasan'}</span>
                            <span className="italic text-slate-700 dark:text-slate-300">
                              "{msg.draft.fields.reason}"
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 text-slate-600 dark:text-slate-300">
                          <div>
                            <span className="text-slate-400 block text-[10px]">{isEn ? 'Date' : 'Tanggal Lembur'}</span>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                              {msg.draft.fields.date}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px]">{isEn ? 'Duration' : 'Durasi'}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                              {msg.draft.fields.durationHours} {isEn ? 'Hours' : 'Jam'}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[10px]">{isEn ? 'Time Slot' : 'Rentang Jam'}</span>
                            <span className="font-mono font-semibold text-slate-800 dark:text-slate-100">
                              {msg.draft.fields.startTime} - {msg.draft.fields.endTime}
                            </span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[10px]">{isEn ? 'Reason' : 'Alasan'}</span>
                            <span className="italic text-slate-700 dark:text-slate-300">
                              "{msg.draft.fields.reason}"
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action buttons (HITL Step 1) */}
                      {msg.draft.confirmed ? (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>{isEn ? 'Submitted & Waiting Leader Approval' : 'Terkirim & Menunggu Persetujuan Atasan'}</span>
                        </div>
                      ) : msg.draft.cancelled ? (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-1.5 text-slate-400 font-semibold text-xs">
                          <AlertCircle className="w-4 h-4" />
                          <span>{isEn ? 'Draft Cancelled' : 'Draf Dibatalkan'}</span>
                        </div>
                      ) : (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                          <button
                            type="button"
                            disabled={actionLoadingId === msg.draft.id}
                            onClick={() => handleConfirmDraft(msg.id, msg.draft.id)}
                            className="flex-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                          >
                            {actionLoadingId === msg.draft.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                            <span>{isEn ? 'Submit Request' : 'Kirim Pengajuan'}</span>
                          </button>
                          <button
                            type="button"
                            disabled={actionLoadingId === msg.draft.id}
                            onClick={() => handleCancelDraft(msg.id, msg.draft.id)}
                            className="py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors"
                          >
                            {isEn ? 'Cancel' : 'Batal'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Knowledge Base Policy Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-3 space-y-2 border-t border-slate-200 dark:border-slate-700 pt-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                        {isEn ? 'Policy Reference Docs:' : 'Referensi Dokumen Kebijakan:'}
                      </span>
                      {msg.sources.map((src, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs"
                        >
                          <p className="font-bold text-slate-800 dark:text-slate-100">{src.title}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
                            {src.snippet}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 px-1 mt-1">{msg.timestamp}</span>
              </div>
            );
          })}

          {/* Assistant typing indicator */}
          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="rounded-2xl px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-xs flex items-center gap-2 rounded-bl-xs">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400" />
                <span>{isEn ? 'AI Orchestrator is analyzing intent & rules...' : 'AI sedang menganalisis pesan & aturan...'}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            {isEn ? 'Quick Examples' : 'Contoh Permintaan'}
          </p>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {quickPrompts.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSend(q)}
                disabled={isLoading}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 text-xs font-medium transition-all shrink-0 cursor-pointer disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={
                isEn
                  ? 'Type leave or overtime request naturally...'
                  : 'Ketik izin cuti atau klaim lembur secara natural...'
              }
              disabled={isLoading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 shadow-md shadow-blue-500/20 disabled:shadow-none transition-all cursor-pointer disabled:cursor-not-allowed shrink-0"
              title={isEn ? 'Send' : 'Kirim'}
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}

