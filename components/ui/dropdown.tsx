import React, { useEffect, useRef, useState } from 'react';

interface Option {
  label: string;
  value: string;
}

interface DropdownProps {
  label?: string;
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

export default function Dropdown({ label, options, value, onChange, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | undefined>(value);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => setSelected(value), [value]);

  function handleSelect(val: string) {
    setSelected(val);
    setOpen(false);
    onChange?.(val);
  }

  const selectedLabel = options.find((o) => o.value === selected)?.label ?? 'Select...';

  return (
    <div ref={ref} className={className}>
      {label && <label className="block text-sm font-medium text-muted-foreground mb-1">{label}</label>}

      <div className="relative inline-block text-left">
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="inline-flex justify-between items-center w-56 rounded-md border px-3 py-2 bg-background text-foreground hover:shadow-sm"
          aria-haspopup="true"
          aria-expanded={open}
        >
          <span className="truncate">{selectedLabel}</span>
          <svg className="ml-2 h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M6 8l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-2 w-56 rounded-md border bg-popover shadow-lg">
            <div className="py-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/50 hover:text-accent-foreground ${
                    opt.value === selected ? 'font-semibold' : 'font-normal'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
