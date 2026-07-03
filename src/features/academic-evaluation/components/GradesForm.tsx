import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import type { Gradebook } from '../../../api/types';
import { Button } from '../../../components/ui/Button';
import { gradeToLetter, gradeValueSchema, weightedAverage } from '../academicEvaluationForms';

type Props = {
  gradebook: Gradebook;
  disabled: boolean;
  pending: boolean;
  onSave: (grades: Array<{
    componenteEvaluacionId: string;
    matriculaCursoProgramadoId: string;
    nota: number;
  }>) => void;
};

type GradeValues = { grades: Record<string, string> };
const keyFor = (studentId: string, componentId: string) => `${studentId}__${componentId}`;

export function GradesForm({ gradebook, disabled, pending, onSave }: Props) {
  const form = useForm<GradeValues>({ defaultValues: { grades: {} } });
  const values = useWatch({ control: form.control, name: 'grades' });

  useEffect(() => {
    const current: Record<string, string> = {};
    gradebook.students.forEach((student) => {
      student.grades.forEach((grade) => {
        current[keyFor(student.matriculaCursoProgramadoId, grade.componenteEvaluacionId)] = grade.nota;
      });
    });
    form.reset({ grades: current });
  }, [form, gradebook]);

  function submit(data: GradeValues) {
    const payload = gradebook.students.flatMap((student) => (
      gradebook.components.flatMap((component) => {
        const parsed = gradeValueSchema.safeParse(
          data.grades[keyFor(student.matriculaCursoProgramadoId, component.id)],
        );
        return parsed.success ? [{
          componenteEvaluacionId: component.id,
          matriculaCursoProgramadoId: student.matriculaCursoProgramadoId,
          nota: parsed.data,
        }] : [];
      })
    ));
    if (payload.length !== gradebook.students.length * gradebook.components.length) {
      form.setError('root', { message: 'Completa todas las notas con valores entre 0 y 20.' });
      return;
    }
    onSave(payload);
  }

  if (!gradebook.components.length) {
    return <div className="table-state">Define los componentes antes de registrar notas.</div>;
  }

  return (
    <form className="grades-form" onSubmit={form.handleSubmit(submit)}>
      <header>
        <div>
          <h2>Libro de notas</h2>
          <p>Escala numérica de 0 a 20 con equivalencias A, B, C y D.</p>
        </div>
        <Button disabled={disabled || pending || !gradebook.students.length} type="submit">
          {pending ? 'Guardando…' : 'Guardar notas'}
        </Button>
      </header>
      {form.formState.errors.root?.message ? (
        <div className="error-banner">{form.formState.errors.root.message}</div>
      ) : null}
      <div className="table-wrap gradebook-wrap">
        <table className="gradebook-table">
          <thead>
            <tr>
              <th>Alumno</th>
              {gradebook.components.map((component) => (
                <th key={component.id}>
                  {component.nombre}
                  <small>{Number(component.porcentaje).toFixed(2)}%</small>
                </th>
              ))}
              <th>Promedio</th>
            </tr>
          </thead>
          <tbody>
            {gradebook.students.map((student) => {
              const notes = gradebook.components.map((component) => {
                const raw = values?.[keyFor(student.matriculaCursoProgramadoId, component.id)];
                const parsed = gradeValueSchema.safeParse(raw);
                return parsed.success ? parsed.data : null;
              });
              const complete = notes.every((note) => note !== null);
              const average = complete
                ? weightedAverage(notes.map((note, index) => ({
                  note: note!,
                  weight: Number(gradebook.components[index]!.porcentaje),
                })))
                : null;
              return (
                <tr key={student.matriculaCursoProgramadoId}>
                  <td>
                    <strong>{student.apellidoPaterno} {student.apellidoMaterno} {student.nombres}</strong>
                    <small>{student.dni}</small>
                  </td>
                  {gradebook.components.map((component, index) => {
                    const value = notes[index] ?? null;
                    return (
                      <td key={component.id}>
                        <input
                          aria-label={`${component.nombre} de ${student.nombres} ${student.apellidoPaterno}`}
                          disabled={disabled}
                          max={20}
                          min={0}
                          step="0.01"
                          type="number"
                          {...form.register(`grades.${keyFor(student.matriculaCursoProgramadoId, component.id)}`)}
                        />
                        <span>{value === null ? '—' : gradeToLetter(value)}</span>
                      </td>
                    );
                  })}
                  <td className="gradebook-average">
                    <strong>{average?.toFixed(2) ?? 'Pendiente'}</strong>
                    <span>{average === null ? '—' : gradeToLetter(average)}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </form>
  );
}
