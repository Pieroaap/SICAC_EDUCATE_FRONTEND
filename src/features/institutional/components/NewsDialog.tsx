import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '../../../components/ui/Button';

export function NewsDialog({ title, busy, onClose, children }: {
  title: string; busy: boolean; onClose: () => void; children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => { dialog.close(); document.body.style.overflow = overflow; trigger?.focus(); };
  }, []);
  return <dialog ref={ref} className="news-dialog" aria-labelledby="news-dialog-title" aria-busy={busy}
    onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <header className="news-dialog-header"><h2 id="news-dialog-title">{title}</h2><Button variant="ghost" aria-label="Cerrar ventana" disabled={busy} onClick={onClose}>✕</Button></header>
    <div className="news-dialog-body">{children}</div>
  </dialog>;
}
