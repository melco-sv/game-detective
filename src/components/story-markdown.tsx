import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

/**
 * Markdown cerita, dirender TANPA HTML mentah (docs/02-arsitektur.md §5.6,
 * §12.4 tech stack). Dipakai untuk briefing, cerita step, dan epilog — semua
 * konten yang (di v2) bisa datang dari chapter buatan dosen.
 */
export function StoryMarkdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      <ReactMarkdown rehypePlugins={[rehypeSanitize]}>{text}</ReactMarkdown>
    </div>
  );
}
