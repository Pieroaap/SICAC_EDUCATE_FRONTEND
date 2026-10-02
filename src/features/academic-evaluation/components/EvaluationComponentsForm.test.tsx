import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { EvaluationComponentsForm } from './EvaluationComponentsForm';

afterEach(cleanup);
it('guarda una evaluación al 20% y muestra una sola fecha', async () => {
  const onSave = vi.fn(); const user = userEvent.setup();
  render(<EvaluationComponentsForm components={[]} disabled={false} pending={false} onCancel={() => {}} onSave={onSave} />);
  expect(screen.getByLabelText('Fecha de la evaluación')).toBeInTheDocument();
  expect(screen.queryByLabelText(/Fecha límite/)).not.toBeInTheDocument();
  await user.type(screen.getByLabelText('Nombre de evaluación 1'), 'Tarea 1');
  await user.clear(screen.getByLabelText('Peso de evaluación 1'));
  await user.type(screen.getByLabelText('Peso de evaluación 1'), '20');
  await user.click(screen.getByRole('button', { name: 'Guardar componentes' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ components: [expect.objectContaining({ nombre: 'Tarea 1', porcentaje: 20 })] }), expect.anything()));
});
