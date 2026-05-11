import ReactMarkdown from 'react-markdown';
import helpMarkdown from '../../docs/help.md?raw';

export function HelpView() {
  return (
    <div className="page help-view">
      <article className="help-prose">
        <ReactMarkdown>{helpMarkdown}</ReactMarkdown>
      </article>
    </div>
  );
}
