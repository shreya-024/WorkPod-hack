/**
 * MessageBubble — Teams-style messaging.
 * AI:   transparent background (no bubble), just padding — like real Teams
 * User: bg var(--user-bubble) #e8e0f7 (light) / #3d3b72 (dark), border-radius 18px
 * Sender name: 14px bold in member color
 * Timestamp: 11px inline after name, opacity 0.6
 * Avatar: 32px circle (50% border-radius)
 */

// ── Markdown renderer ──────────────────────────────────────────────
// Handles: code blocks, tables, bold, italic, inline code, line breaks.
function MarkdownRenderer({ content }) {
  if (!content) return null;

  // Split into code blocks vs normal text
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  const segments = [];
  let last = 0;
  let m;

  while ((m = codeBlockRegex.exec(content)) !== null) {
    if (m.index > last) {
      segments.push({ type: 'text', value: content.slice(last, m.index) });
    }
    segments.push({ type: 'code', lang: m[1], value: m[2].trimEnd() });
    last = m.index + m[0].length;
  }
  if (last < content.length) {
    segments.push({ type: 'text', value: content.slice(last) });
  }

  return (
    <div>
      {segments.map((seg, si) => {
        if (seg.type === 'code') {
          return (
            <pre key={si} style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: '12px 14px',
              overflowX: 'auto',
              fontSize: '0.78rem',
              lineHeight: 1.6,
              margin: '8px 0',
              fontFamily: 'monospace',
              color: 'var(--text-primary)',
            }}>
              <code>{seg.value}</code>
            </pre>
          );
        }

        // Text segment: handle tables, then inline markup
        const lines = seg.value.split('\n');
        const result = [];
        let i = 0;

        while (i < lines.length) {
          const line = lines[i];

          // Detect markdown table: line with | and next line is separator
          const isTableHeader = /^\s*\|.+\|/.test(line);
          const isSeparator   = /^\s*\|[\s\-|:]+\|/.test(lines[i + 1] || '');

          if (isTableHeader && isSeparator) {
            const headerCells = line.split('|').filter(c => c.trim() !== '');
            const tableRows = [];
            i += 2; // skip header + separator
            while (i < lines.length && /^\s*\|/.test(lines[i])) {
              const cells = lines[i].split('|').filter(c => c.trim() !== '');
              tableRows.push(cells);
              i++;
            }
            result.push(
              <div key={`tbl-${si}-${result.length}`} style={{ overflowX: 'auto', margin: '8px 0' }}>
                <table style={{
                  borderCollapse: 'collapse', fontSize: '0.8rem',
                  width: '100%', minWidth: 300,
                }}>
                  <thead>
                    <tr>
                      {headerCells.map((h, hi) => (
                        <th key={hi} style={{
                          padding: '6px 10px', textAlign: 'left',
                          borderBottom: '2px solid var(--border)',
                          color: 'var(--text-secondary)', fontWeight: 600,
                          whiteSpace: 'nowrap',
                        }}>
                          {h.trim()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                        {row.map((cell, ci) => (
                          <td key={ci} style={{
                            padding: '5px 10px',
                            color: 'var(--text-primary)',
                            fontSize: '0.78rem',
                          }}>
                            <InlineMarkdown text={cell.trim()} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
            continue;
          }

          // Normal text line
          const trimmed = line.trimEnd();
          if (trimmed === '') {
            // blank line = paragraph break
            result.push(<div key={`br-${si}-${i}`} style={{ height: 6 }} />);
          } else {
            result.push(
              <div key={`ln-${si}-${i}`} style={{ lineHeight: 1.65 }}>
                <InlineMarkdown text={trimmed} />
              </div>
            );
          }
          i++;
        }

        return <div key={si}>{result}</div>;
      })}
    </div>
  );
}

// Renders inline markdown: **bold**, *italic*, `code`
function InlineMarkdown({ text }) {
  // tokenise into spans
  const tokens = [];
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
  let last = 0;
  let m;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) tokens.push({ type: 'text', value: text.slice(last, m.index) });

    if (m[2] !== undefined) tokens.push({ type: 'bold',   value: m[2] });
    else if (m[3] !== undefined) tokens.push({ type: 'italic', value: m[3] });
    else if (m[4] !== undefined) tokens.push({ type: 'code',   value: m[4] });

    last = m.index + m[0].length;
  }
  if (last < text.length) tokens.push({ type: 'text', value: text.slice(last) });

  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === 'bold')   return <strong key={i}>{t.value}</strong>;
        if (t.type === 'italic') return <em key={i}>{t.value}</em>;
        if (t.type === 'code')   return (
          <code key={i} style={{
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border)',
            borderRadius: 4, padding: '1px 5px',
            fontSize: '0.78rem', fontFamily: 'monospace',
            color: 'var(--text-primary)',
          }}>{t.value}</code>
        );
        return <span key={i}>{t.value}</span>;
      })}
    </>
  );
}

// ── Parse multi-speaker AI messages ───────────────────────────────
// Handles both:
//   **[Priya]**: some text   (bracket format)
//   **Priya**: some text     (no-bracket format, what LLMs often output)
function parseAiMessage(content) {
  // Matches **[Name]**: or **Name**: at the start of a speaker turn
  const regex = /\*\*\[?([A-Za-z][^*\]\n]{1,40}?)\]?\*\*:\s*/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Any text before this speaker tag belongs to a previous (unnamed) segment
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) parts.push({ name: null, text });
    }
    // Find where this speaker's text ends (at next tag, or end of string)
    const textStart = match.index + match[0].length;
    // Re-run regex from textStart to find the next speaker tag
    const nextTagRegex = /\*\*\[?([A-Za-z][^*\]\n]{1,40}?)\]?\*\*:\s*/g;
    nextTagRegex.lastIndex = 0;
    const remaining = content.slice(textStart);
    const nextMatch = nextTagRegex.exec(remaining);
    const textEnd = nextMatch ? textStart + nextMatch.index : content.length;
    const text = content.slice(textStart, textEnd).trim();

    parts.push({ name: match[1].trim(), text });
    lastIndex = textEnd;
    regex.lastIndex = textEnd;
  }

  // Trailing text after the last tag
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) parts.push({ name: null, text });
  }

  return parts.length > 0 ? parts : [{ name: null, text: content }];
}

function getColorFromName(name) {
  const colors = ['#0a66c2','#2ecc8a','#e05555','#f0a500','#8764b8','#00b4d8','#f7630c'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash) + name.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

function Avatar({ color, initials, size = 32 }) {
  return (
    <div style={{
      width: size, height: size,
      borderRadius: '50%',
      background: color,
      color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.6rem',
      fontWeight: 700,
      flexShrink: 0,
      minWidth: size,
    }}>
      {initials}
    </div>
  );
}

export default function MessageBubble({ msg, memberMap, prevMsg }) {
  const isSystem = msg.senderType === 'system';
  const isUser   = msg.senderType === 'user';
  const isAI     = msg.senderType === 'ai';
  const isMentor = msg.senderType === 'mentor';

  const time = msg.timestamp
    ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const sameSource = prevMsg &&
    prevMsg.senderType === msg.senderType &&
    prevMsg.sender === msg.sender;

  // ── System message ────────────────────────────────────────
  if (isSystem) {
    return (
      <div style={{ textAlign: 'center', margin: '8px 0', padding: '0 16px', animation: 'fadeIn 0.3s both' }}>
        <span style={{
          fontSize: '0.7rem',
          color: msg.isEmergency ? 'var(--danger)' : 'var(--text-tertiary)',
          background: msg.isEmergency ? 'rgba(224,85,85,0.08)' : 'transparent',
          border: msg.isEmergency ? '1px solid rgba(224,85,85,0.2)' : 'none',
          borderRadius: 20, padding: msg.isEmergency ? '4px 12px' : '0',
          fontWeight: msg.isEmergency ? 600 : 400,
          display: 'inline-block',
        }}>
          {msg.content}
        </span>
      </div>
    );
  }

  // ── User message (right-aligned) ──────────────────────────
  if (isUser) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'flex-end',
        marginTop: sameSource ? 2 : 10,
        padding: '0 16px',
        animation: 'fadeIn 0.2s both',
      }}>
        <div style={{ maxWidth: '62%' }}>
          {!sameSource && (
            <div style={{
              textAlign: 'right',
              marginBottom: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6,
            }}>
              <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace', opacity: 0.6 }}>
                {time}
              </span>
              <span style={{ fontSize: '14px', fontWeight: 700, color: '#0a66c2' }}>
                You
              </span>
            </div>
          )}
          <div style={{
            background: 'var(--user-bubble, #e8e0f7)',
            borderRadius: 18,
            padding: '8px 14px',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            color: 'var(--text-primary)',
            wordWrap: 'break-word',
          }}>
            {msg.content}
          </div>
        </div>
      </div>
    );
  }

  // ── AI message (left-aligned) ─────────────────────────────
  if (isAI) {
    const parts = parseAiMessage(msg.content);
    return (
      <div style={{ marginTop: sameSource ? 2 : 10, padding: '0 16px', animation: 'fadeIn 0.3s both' }}>
        {parts.map((part, i) => {
          if (!part.text) return null;
          const member = part.name ? memberMap?.[part.name] : null;
          // Use parsed name → member color → hash color; fall back to msg.sender for display
          const displayName = part.name || msg.sender || 'AI';
          const color = member?.color || getColorFromName(displayName);
          const initials = displayName
            ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
            : 'AI';

          // Named speakers always get their own header; only suppress for unnamed consecutive chunks
          const showHeader = part.name ? true : (!sameSource || i > 0);

          return (
            <div key={i} style={{
              display: 'flex', gap: 8, alignItems: 'flex-start',
              maxWidth: '76%',
              marginBottom: i < parts.length - 1 ? 8 : 0,
            }}>
              {/* Avatar column — always 32px wide to keep text aligned */}
              {showHeader
                ? <Avatar color={color} initials={initials} />
                : <div style={{ width: 32, flexShrink: 0 }} />
              }

              <div style={{ flex: 1, minWidth: 0 }}>
                {showHeader && (
                  <div style={{
                    marginBottom: 2,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: 700, color }}>
                      {displayName}
                    </span>
                    {member?.role && (
                      <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 400 }}>
                        {member.role}
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace', opacity: 0.6 }}>
                      {time}
                    </span>
                  </div>
                )}
                <div style={{
                  fontSize: '0.875rem',
                  lineHeight: 1.5,
                  color: 'var(--text-primary)',
                  wordWrap: 'break-word',
                }}>
                  <MarkdownRenderer content={part.text} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Mentor message ────────────────────────────────────────
  if (isMentor) {
    const mentorColor = '#0a66c2';
    const mentorInitials = msg.sender
      ? msg.sender.split(' ').map(n => n[0]).join('').toUpperCase()
      : 'TL';

    // Strip **[Name]**: prefix from mentor messages too
    const mentorContent = msg.content.replace(/^\*\*\[[^\]]+\]\*\*:\s*/, '');

    return (
      <div style={{ marginTop: sameSource ? 2 : 10, padding: '0 16px', animation: 'fadeIn 0.25s both' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', maxWidth: '76%' }}>
          {!sameSource
            ? <Avatar color={mentorColor} initials={mentorInitials} />
            : <div style={{ width: 32, flexShrink: 0 }} />
          }

          <div style={{ flex: 1, minWidth: 0 }}>
            {!sameSource && (
              <div style={{ marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '14px', fontWeight: 700, color: mentorColor }}>
                  {msg.sender || 'Mentor'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 400 }}>
                  Team Lead
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'monospace', opacity: 0.6 }}>
                  {time}
                </span>
              </div>
            )}
            <div style={{
              fontSize: '0.875rem',
              lineHeight: 1.5,
              color: 'var(--text-primary)',
              wordWrap: 'break-word',
            }}>
              <MarkdownRenderer content={mentorContent} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
