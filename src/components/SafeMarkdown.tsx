'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Components } from 'react-markdown';

const createSafeComponents = (): Components => ({
  p: ({ children }) => <p>{children}</p>,
  code: ({ children, className, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }

    return (
      <pre>
        <code className={className}>{children}</code>
      </pre>
    );
  },
});

interface SafeMarkdownProps {
  children: string;
  className?: string;
}

const looksLikeInlineMath = (value: string) => {
  const text = value.trim();
  if (!text) {
    return false;
  }

  return (
    /\\[a-zA-Z]+/.test(text) ||
    /[=^_]/.test(text) ||
    /\d\s*[+\-*/]\s*\d/.test(text) ||
    /^[a-zA-Z]$/.test(text)
  );
};

const normalizeMathMarkdown = (value: string) =>
  value
    .replace(/```math\s*([\s\S]*?)\s*```/g, '$$$$\n$1\n$$$$')
    .replace(/```latex\s*([\s\S]*?)\s*```/g, '$$$$\n$1\n$$$$')
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$')
    // Repair common AI typo: "$a \cdot b = 0`" should be "$a \cdot b = 0$".
    .replace(/\$([^$\n`]*(?:\\[a-zA-Z]+|[=^_])[^$\n`]*)`/g, (_match, math) => `$${math.trim()}$`)
    .replace(/lim\(x(?:->|→)([a-zA-Z0-9]+)\)/g, '\\lim_{x \\to $1}')
    // AI often wraps short math expressions in Markdown code ticks.
    .replace(/(?<!`)`([^`\n]+)`(?!`)/g, (match, content) =>
      looksLikeInlineMath(content) ? `$${content.trim()}$` : match,
    )
    .replace(/\\\*/g, '*');

export default function SafeMarkdown({ children, className }: SafeMarkdownProps) {
  const processedContent = normalizeMathMarkdown(children || '');

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: false }]]}
        components={createSafeComponents()}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
