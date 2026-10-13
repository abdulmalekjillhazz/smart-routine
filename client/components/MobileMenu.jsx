'use client';

import { useEffect, useId, useRef, useState } from 'react';

// Shows a menu button on phones. On tablets and laptops the links are always visible.
// Escape closes the menu and returns focus to the button. Choosing a link also closes it.
export function MobileMenu({ label, closeLabel, children }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return undefined;
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function closeIfLink(event) {
    if (event.target instanceof Element && event.target.closest('a')) setOpen(false);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="ml-auto min-h-[44px] min-w-[44px] rounded-lg border border-paper/60 px-4 py-2 font-semibold text-paper md:hidden"
      >
        {open ? closeLabel : label}
      </button>
      <div
        id={panelId}
        onClick={closeIfLink}
        className={`${open ? 'flex' : 'hidden'} w-full flex-col gap-1 md:flex md:w-auto md:flex-row md:items-center md:gap-4`}
      >
        {children}
      </div>
    </>
  );
}
