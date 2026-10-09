import { useState } from 'react';
import { Cpu, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';

export interface TokenUsagePanelProps {
  tokenUsage?: {
    calls: number;
    promptTokens: number;
    completionTokens: number;
    cacheHits: number;
  };
  className?: string;
}

export function TokenUsagePanel({ tokenUsage, className }: TokenUsagePanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!tokenUsage) return null;

  const totalTokens = tokenUsage.promptTokens + tokenUsage.completionTokens;

  return (
    <div className={cn('bg-slate-50 border border-slate-200 rounded-lg overflow-hidden text-xs', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 flex items-center justify-between text-left hover:bg-slate-100/60 transition-colors"
      >
        <div className="flex items-center gap-2 text-slate-700">
          <Cpu className="w-3.5 h-3.5 text-brand-teal" />
          <span className="font-medium">Penggunaan Token AI</span>
          <span className="text-[10px] text-slate-500 font-mono">
            ({totalTokens.toLocaleString('id-ID')} token)
          </span>
        </div>
        <div className="text-slate-400">
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 pb-3 pt-1 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-600">
          <div className="p-2 bg-white rounded border border-slate-200">
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Panggilan LLM</span>
            <span className="font-semibold text-slate-800 font-mono text-sm">{tokenUsage.calls}</span>
          </div>
          <div className="p-2 bg-white rounded border border-slate-200">
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Prompt Token</span>
            <span className="font-semibold text-slate-800 font-mono text-sm">{tokenUsage.promptTokens.toLocaleString('id-ID')}</span>
          </div>
          <div className="p-2 bg-white rounded border border-slate-200">
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Completion</span>
            <span className="font-semibold text-slate-800 font-mono text-sm">{tokenUsage.completionTokens.toLocaleString('id-ID')}</span>
          </div>
          <div className="p-2 bg-white rounded border border-slate-200">
            <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Cache Hits</span>
            <span className="font-semibold text-brand-teal font-mono text-sm">{tokenUsage.cacheHits}</span>
          </div>
        </div>
      )}
    </div>
  );
}
