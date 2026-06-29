import { cn } from '../lib/cn';

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={cn('status-badge', active ? 'is-active' : 'is-inactive')}>
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}
