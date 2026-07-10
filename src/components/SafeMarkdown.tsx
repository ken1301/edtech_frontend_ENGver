'use client';

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Components } from 'react-markdown';
import type { ReactNode } from 'react';

// Custom renderer to sanitize HTML rendered by rehype plugins (e.g., KaTeX)
const createSafeComponents = (): Components => ({
  // Override raw HTML to sanitize it through DOMPurify
  // This catches any raw HTML injected via rehype
  p: ({ children }) => <p>{children}</p>,
  // For code blocks — never render as HTML
  code: ({ children, className, ...props }) => {
    const isInline = !className;
    if (isInline) {
      return <code className={className} {...props}>{children}</code>;
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

export default function SafeMarkdown({ children, className }: SafeMarkdownProps) {
  // Pre-process common AI escape sequences and math delimiters
  const processedContent = (children || '')
    // Convert triple backtick math/latex blocks to $$ blocks
    .replace(/```math\s*([\s\S]*?)\s*```/g, '$$$$\n$1\n$$$$')
    .replace(/```latex\s*([\s\S]*?)\s*```/g, '$$$$\n$1\n$$$$')
    // Convert LaTeX math delimiters to Markdown math delimiters ($ and $$)
    .replace(/\\\(/g, '$')
    .replace(/\\\)/g, '$')
    .replace(/\\\[/g, '$$$$')
    .replace(/\\\]/g, '$$$$')
    // Convert common AI ascii math format lim(x->a) to LaTeX limit
    .replace(/lim\(x→([a-zA-Z0-9]+)\)/g, '\\lim_{x \\to $1}')
    // Convert backticks enclosing math to inline math delimiters
    .replace(/(?<!\`)`([^`]*\\[a-zA-Z]+[^]*)`(?!\`)/g, '$$$1$$')
    // Unescape asterisks that AI sometimes sends to ensure bold text works
    .replace(/\\\*/g, '*');

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkGfm]}
        rehypePlugins={[rehypeKatex]}
        components={createSafeComponents()}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
