import AIReport from './AIReport';

interface Props { title: string; content: string; loading?: boolean; timestamp?: string; }

export default function AIResponse({ title, content, loading, timestamp }: Props) {
  if (!loading && !content) return null;
  return <AIReport title={timestamp ? `${title} · ${timestamp}` : title} response={content} loading={loading} />;
}
