import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Search,
  Trash2,
  Copy,
  Download,
  Pause,
  Play,
  ArrowDown,
  Send,
  Filter,
} from 'lucide-react';
import { useLauncher } from '../../context/LauncherContext';
import { LogEntry } from '../../types/launcher';

export const ConsoleView: React.FC = () => {
  const { logs, clearLogs, addLog, activeInstance, launchInstance } = useLauncher();
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [commandInput, setCommandInput] = useState('');
  const consoleBottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (autoScroll) {
      consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = filterLevel === 'all' || log.level === filterLevel;
    const matchesSearch =
      !search || log.message.toLowerCase().includes(search.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  const handleCopyLogs = () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}]: ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleSaveLogs = () => {
    const text = filteredLogs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}]: ${l.message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `victusclient-log-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendCommand = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;

    const cmd = commandInput.trim();
    addLog('info', `> ${cmd}`, 'User');

    // Built-in command handling
    if (cmd === '/help') {
      addLog('launcher', 'VictusClient Console Commands:');
      addLog('launcher', '  /help - Display help manual');
      addLog('launcher', '  /clear - Clear the console log window');
      addLog('launcher', '  /launch - Launch active instance');
      addLog('launcher', '  /instances - List all configured instances');
      addLog('launcher', '  /gc - Trigger garbage collection in JVM');
    } else if (cmd === '/clear') {
      clearLogs();
    } else if (cmd === '/launch') {
      if (activeInstance) launchInstance(activeInstance.id);
      else addLog('error', 'No active instance selected to launch.');
    } else if (cmd === '/gc') {
      addLog('info', 'Invoking System.gc() request...');
    } else {
      addLog('info', `Executed: ${cmd}`);
    }

    setCommandInput('');
  };

  const getLevelStyle = (level: LogEntry['level']) => {
    switch (level) {
      case 'error':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'warn':
        return 'text-amber-300 bg-amber-500/10 border-amber-500/30';
      case 'launcher':
        return 'text-[var(--color-primary-light)] bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30';
      case 'debug':
        return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      default:
        return 'text-white/80 bg-white/5 border-white/10';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden px-6 py-5 space-y-4 select-none">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-xl bg-[var(--color-primary)] text-white shadow-[0_0_12px_var(--color-glow)]">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-black text-xl text-white tracking-tight">
              Minecraft Console
            </h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              Real-time launch pipeline & game runtime logs
            </p>
          </div>
        </div>

        {/* Toolbar buttons */}
        <div className="flex items-center space-x-2">
          {/* Level Filter */}
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:border-[var(--color-primary)]"
          >
            <option value="all" className="bg-[#121424]">All Levels</option>
            <option value="info" className="bg-[#121424]">INFO</option>
            <option value="warn" className="bg-[#121424]">WARN</option>
            <option value="error" className="bg-[#121424]">ERROR</option>
            <option value="launcher" className="bg-[#121424]">LAUNCHER</option>
          </select>

          {/* Search */}
          <div className="relative w-40">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-white/30 focus:outline-none"
            />
          </div>

          {/* Auto Scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`p-2 rounded-xl border transition-all ${
              autoScroll
                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary-light)] border-[var(--color-primary)]'
                : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
            }`}
            title={autoScroll ? 'Disable Auto Scroll' : 'Enable Auto Scroll'}
          >
            <ArrowDown className="w-4 h-4" />
          </button>

          {/* Copy */}
          <button
            onClick={handleCopyLogs}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
            title="Copy Logs to Clipboard"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Save file */}
          <button
            onClick={handleSaveLogs}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors"
            title="Save Log File"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Clear */}
          <button
            onClick={clearLogs}
            className="p-2 rounded-xl hover:bg-rose-500/20 text-white/40 hover:text-rose-400 border border-white/10 transition-colors"
            title="Clear Console Output"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Terminal Window */}
      <div className="flex-1 rounded-2xl glass-panel bg-[#0b0c14]/95 border border-[var(--color-border)] p-4 font-mono text-xs overflow-y-auto space-y-1.5 select-text shadow-inner">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-white/30 select-none">
            No logs to display. Launch an instance to monitor output.
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="flex items-start space-x-2 leading-relaxed hover:bg-white/[0.02] px-1 rounded">
              <span className="text-white/40 flex-shrink-0 select-none">[{log.timestamp}]</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold border flex-shrink-0 select-none ${getLevelStyle(
                  log.level
                )}`}
              >
                {log.level}
              </span>
              <span className="text-white/90 break-all">{log.message}</span>
            </div>
          ))
        )}
        <div ref={consoleBottomRef} />
      </div>

      {/* Bottom Command Prompt */}
      <form onSubmit={handleSendCommand} className="flex items-center space-x-2 flex-shrink-0">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 font-mono text-xs">
            &gt;
          </span>
          <input
            type="text"
            placeholder="Enter launcher or Minecraft command (e.g. /help, /gc, /clear)..."
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-xs font-bold uppercase tracking-wider flex items-center space-x-1.5 shadow-[0_0_12px_var(--color-glow)] transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};
