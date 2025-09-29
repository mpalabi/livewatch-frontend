import { useEffect, useMemo, useRef, useState } from 'react';

function isEmail(str: string) {
  return /.+@.+\..+/.test(str);
}

export default function EmailChips({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  function addFromInput() {
    const parts = input.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const valid = parts.filter(isEmail);
    if (valid.length) {
      const set = new Set([...value, ...valid]);
      onChange(Array.from(set));
    }
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addFromInput();
    } else if (e.key === 'Backspace' && !input && value.length) {
      const arr = [...value];
      arr.pop();
      onChange(arr);
    }
  }

  function remove(idx: number) {
    const arr = value.filter((_, i) => i !== idx);
    onChange(arr);
  }

  return (
    <div className="chips-input" onClick={() => inputRef.current?.focus()}>
      {value.map((email, idx) => (
        <span key={email+idx} className="chip">
          {email}
          <button type="button" aria-label="remove" onClick={() => remove(idx)}>×</button>
        </span>
      ))}
      <input
        ref={inputRef}
        className="chips-field"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onBlur={addFromInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Add email and press Enter'}
      />
    </div>
  );
}


