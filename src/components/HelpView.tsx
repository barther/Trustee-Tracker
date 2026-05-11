import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import helpMarkdown from '../../docs/help.md?raw';

export function HelpView() {
  return (
    <div className="page help-view">
      <article className="help-prose">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{helpMarkdown}</ReactMarkdown>
      </article>
    </div>
  );
}
