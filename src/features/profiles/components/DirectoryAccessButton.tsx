import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { Button } from '../../../components/ui/Button';

export function DirectoryAccessButton({ disabled, pending, onClick }: { disabled: boolean; pending: boolean; onClick: () => void }) {
  return <Button className="table-action-button" variant="secondary" disabled={disabled} onClick={onClick}>
    {pending ? <LoaderCircle aria-hidden="true" className="animate-spin" size={15} /> : <ShieldCheck aria-hidden="true" size={15} />}
    {pending ? 'Habilitando…' : 'Dar acceso'}
  </Button>;
}
