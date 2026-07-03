import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import type { EvaluationComponent } from '../../../api/types';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import {
  componentsSchema,
  type ComponentsValues,
} from '../academicEvaluationForms';

type Props = {
  components: EvaluationComponent[];
  disabled: boolean;
  error?: string | undefined;
  pending: boolean;
  onCancel: () => void;
  onSave: (values: ComponentsValues) => void;
};

export function EvaluationComponentsForm({
  components,
  disabled,
  error,
  pending,
  onCancel,
  onSave,
}: Props) {
  const form = useForm<ComponentsValues>({
    resolver: zodResolver(componentsSchema),
    defaultValues: { components: [{ nombre: '', porcentaje: 100, orden: 1 }] },
  });
  const fields = useFieldArray({ control: form.control, name: 'components' });
  const watched = useWatch({ control: form.control, name: 'components' });
  const total = watched.reduce((sum, item) => sum + Number(item.porcentaje || 0), 0);

  useEffect(() => {
    if (components.length) {
      form.reset({
        components: components.map((item) => ({
          id: item.id,
          nombre: item.nombre,
          porcentaje: Number(item.porcentaje),
          orden: item.orden,
        })),
      });
    }
  }, [components, form]);

  return (
    <form className="evaluation-components" onSubmit={form.handleSubmit(onSave)}>
      <header>
        <div>
          <h2>Componentes de evaluación</h2>
          <p>El profesor puede ajustar los pesos mientras el acta esté abierta.</p>
        </div>
        <strong className={Math.abs(total - 100) < 0.001 ? 'is-complete' : 'is-pending'}>
          {total.toFixed(2)}%
        </strong>
      </header>
      {fields.fields.map((field, index) => (
        <div className="evaluation-component-field" key={field.id}>
          <div className="evaluation-component-row">
            <Input
              aria-label={`Nombre de evaluación ${index + 1}`}
              disabled={disabled}
              {...form.register(`components.${index}.nombre`)}
            />
            <Input
              aria-label={`Peso de evaluación ${index + 1}`}
              disabled={disabled}
              max={100}
              min={0.01}
              step="0.01"
              type="number"
              {...form.register(`components.${index}.porcentaje`, { valueAsNumber: true })}
            />
            <input type="hidden" {...form.register(`components.${index}.id`)} />
            <input type="hidden" value={index + 1} {...form.register(`components.${index}.orden`, { valueAsNumber: true })} />
            <Button
              aria-label={`Eliminar evaluación ${index + 1}`}
              disabled={disabled || fields.fields.length === 1}
              onClick={() => fields.remove(index)}
              type="button"
              variant="ghost"
            >
              <Trash2 size={16} />
            </Button>
          </div>
          {form.formState.errors.components?.[index] ? (
            <p className="field-error">
              {form.formState.errors.components[index]?.nombre?.message
                ?? form.formState.errors.components[index]?.porcentaje?.message
                ?? form.formState.errors.components[index]?.orden?.message
                ?? form.formState.errors.components[index]?.id?.message}
            </p>
          ) : null}
        </div>
      ))}
      {form.formState.errors.components?.message ? (
        <p className="field-error">{form.formState.errors.components.message}</p>
      ) : null}
      {error ? <div className="error-banner" role="alert">{error}</div> : null}
      <footer className="evaluation-components__footer">
        {!disabled ? (
          <Button
            disabled={pending}
            onClick={() => fields.append({
              nombre: '',
              porcentaje: 0,
              orden: fields.fields.length + 1,
            })}
            type="button"
            variant="secondary"
          >
            <Plus size={16} /> Agregar evaluación
          </Button>
        ) : <span />}
        <div>
          <Button disabled={pending} onClick={onCancel} type="button" variant="secondary">
            {disabled ? 'Cerrar' : 'Cancelar'}
          </Button>
          {!disabled ? (
            <Button disabled={pending} type="submit">
              {pending ? 'Guardando…' : 'Guardar componentes'}
            </Button>
          ) : null}
        </div>
      </footer>
    </form>
  );
}
