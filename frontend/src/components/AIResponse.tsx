import { useState } from 'react';
import { Sparkles, Copy, Check } from 'lucide-react';

interface Props { title: string; content: string; loading?: boolean; timestamp?: string; }

function parseContent(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('- ') || line.startsWith('• ')) return <li key={i} className="ml-4 text-gray-200">{line.slice(2)}</li>;
    if (line.match(/^\d+\./)) return <li key={i} className="ml-4 text-gray-200 list-decimal">{line.replace(/^\d+\.\s*/, '')}</li>;
    if (line === '') return <br key={i} />;
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return <p key={i} className="text-gray-200">{parts.map((p, j) => p.startsWith('**') && p.endsWith('**') ? <strong key={j} className="text-white">{p.slice(2,-2)}</strong> : p)}</p>;
  });
}

export default function AIResponse({ title, content, loading, timestamp }: Props) {
  const [copied, setCopied] = useState(false);
  function copy() { navigator.clipboard.writeText(content); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  if (loading) return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-900 to-indigo-900 p-6 border border-violet-700/50">
      <div className="flex items-center gap-3 mb-4"><Sparkles size={20} className="text-violet-300" /><span className="font-semibold text-violet-200">{title}</span></div>
      <div className="space-y-3">{[1,2,3].map(i => <div key={i} className={`h-4 bg-violet-800/50 rounded animate-pulse w-${['full','5/6','4/6'][i-1]}`} />)}</div>
    </div>
  );
  if (!content) return null;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-900 to-indigo-900 p-6 border border-violet-700/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3"><Sparkles size={20} className="text-violet-300" /><span className="font-semibold text-violet-200">{title}</span>{timestamp && <span className="text-xs text-violet-400">{timestamp}</span>}</div>
        <button onClick={copy} className="text-violet-400 hover:text-white flex items-center gap-1 text-sm">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <div className="text-sm space-y-1">{parseContent(content)}</div>
    </div>
  );
}
