// ─── MARKDOWN HELPERS ───
// Shared minimal markdown renderer used by the blog list and post pages.

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function inlineMarkdown(text) {
  const preserved = [];
  const token = html => {
    const key = `\u0000MD${preserved.length}\u0000`;
    preserved.push(html);
    return key;
  };

  let out = text
    .replace(/!\[([^\]]*)]\(((?:[^()\s]|\([^()]*\))+?)\)/g, (_, alt, url) => token(`<img src="${escapeHtml(url)}" alt="${escapeHtml(alt)}">`))
    .replace(/\[([^\]]+)]\(((?:[^()\s]|\([^()]*\))+?)\)/g, (_, label, url) => token(`<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${label}</a>`))
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>');

  out = out.replace(/\u0000MD(\d+)\u0000/g, (_, i) => preserved[Number(i)] || '');
  return out;
}

function markdownToHtml(markdown) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let html = '';
  let listType = null;
  let inBlockquote = false;
  let inCode = false;

  const closeList = () => {
    if (!listType) return;
    html += listType === 'ol' ? '</ol>' : '</ul>';
    listType = null;
  };

  const closeBlockquote = () => {
    if (inBlockquote) {
      html += '</blockquote>';
      inBlockquote = false;
    }
  };

  lines.forEach(line => {
    if (inCode) {
      if (line.trim() === '```') {
        html += '</code></pre>';
        inCode = false;
      } else {
        html += escapeHtml(line) + '\n';
      }
      return;
    }

    const trimmed = line.trim();
    if (trimmed === '```') {
      closeList();
      closeBlockquote();
      inCode = true;
      html += '<pre><code>';
      return;
    }

    if (/^#{1,6}\s+/.test(trimmed)) {
      closeList();
      closeBlockquote();
      const level = trimmed.match(/^#{1,6}/)[0].length;
      html += `<h${level}>${inlineMarkdown(escapeHtml(trimmed.replace(/^#{1,6}\s+/, '')))}</h${level}>`;
      return;
    }

    if (/^>\s?/.test(trimmed)) {
      closeList();
      if (!inBlockquote) {
        inBlockquote = true;
        html += '<blockquote>';
      }
      html += inlineMarkdown(escapeHtml(trimmed.replace(/^>\s?/, '')));
      return;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      closeBlockquote();
      if (listType !== 'ul') {
        closeList();
        listType = 'ul';
        html += '<ul>';
      }
      html += `<li>${inlineMarkdown(escapeHtml(trimmed.replace(/^[-*+]\s+/, '')))}</li>`;
      return;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      closeBlockquote();
      if (listType !== 'ol') {
        closeList();
        listType = 'ol';
        html += '<ol>';
      }
      html += `<li>${inlineMarkdown(escapeHtml(trimmed.replace(/^\d+\.\s+/, '')))}</li>`;
      return;
    }

    closeList();
    closeBlockquote();

    if (/^---+$/.test(trimmed)) {
      html += '<hr>';
      return;
    }

    if (!trimmed) return;
    html += `<p>${inlineMarkdown(escapeHtml(trimmed))}</p>`;
  });

  closeList();
  closeBlockquote();
  return html;
}

function extractExcerpt(markdown, maxLength = 220) {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[([^\]]*)]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '$1')
    .replace(/[#>*`_~\-+]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length <= maxLength ? plain : plain.slice(0, maxLength).trim() + '…';
}

function estimateReadingTime(markdown) {
  const words = (markdown || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function slugify(text) {
  return (text || '')
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
