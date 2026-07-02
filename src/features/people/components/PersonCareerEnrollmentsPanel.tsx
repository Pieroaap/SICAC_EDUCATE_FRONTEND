import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { getApiErrorMessage } from '../../../api/client';
import type { RoleCode } from '../../../api/types';
import { FormField } from '../../../components/FormField';
import { Button } from '../../../components/ui/Button';
import {
  careerRegistrationSchema,
  type CareerRegistrationValues,
} from '../../academic-operation/academicOperationForms';
import {
  createCareerRegistration,
  getCareerRegistrations,
  updateCareerRegistrationState,
} from '../../academic-operation/api/academicOperationApi';
import {
  getCareers,
  getAcademicPeriods,
  getCurriculumPlans,
} from '../../academic-structure/api/academicStructureApi';

const periodOrder = { I: 1, II: 2, III: 3 } as const;

export function PersonCareerEnrollmentsPanel({
  actorRoles,
  personId,
}: {
  actorRoles: RoleCode[];
  personId: string;
}) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const canWrite = actorRoles.some((role) => role === 'ADMINISTRADOR_SISTEMA' || role === 'GESTOR_ACADEMICO');
  const form = useForm<CareerRegistrationValues>({
    resolver: zodResolver(careerRegistrationSchema),
    defaultValues: { carreraId: '', planCurricularId: '', periodoInicioId: '' },
  });
  const careerId = useWatch({ control: form.control, name: 'carreraId' });
  const registrations = useQuery({
    queryKey: ['career-registrations', personId],
    queryFn: () => getCareerRegistrations(personId),
  });
  const careers = useQuery({ queryKey: ['academic', 'careers'], queryFn: getCareers });
  const plans = useQuery({ queryKey: ['academic', 'plans'], queryFn: () => getCurriculumPlans() });
  const periods = useQuery({
    queryKey: ['academic', 'periods', careerId],
    queryFn: () => getAcademicPeriods({ carreraId: careerId }),
    enabled: Boolean(careerId),
  });
  const today = new Date().toISOString().slice(0, 10);
  const currentPeriod = periods.data?.find((period) => (
    period.fechaInicio <= today && period.fechaFin >= today
  ));
  const eligiblePeriods = currentPeriod
    ? periods.data?.filter((period) => (
      period.anio > currentPeriod.anio
      || (period.anio === currentPeriod.anio
        && periodOrder[period.periodo] >= periodOrder[currentPeriod.periodo])
    )).sort((left, right) => (
      left.anio - right.anio || periodOrder[left.periodo] - periodOrder[right.periodo]
    )) ?? []
    : [];
  useEffect(() => {
    form.setValue('periodoInicioId', '');
  }, [careerId, form]);
  const create = useMutation({
    mutationFn: (values: CareerRegistrationValues) => createCareerRegistration({ ...values, personaId: personId }),
    onSuccess: async () => {
      form.reset({ carreraId: '', planCurricularId: '', periodoInicioId: '' });
      setShowForm(false);
      await queryClient.invalidateQueries({ queryKey: ['career-registrations', personId] });
    },
  });
  const changeState = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'activo' | 'inactivo' }) =>
      updateCareerRegistrationState(id, estado),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ['career-registrations', personId] }),
  });

  return (
    <div className="detail-panel academic-history-card">
      <div className="academic-history-card__heading">
        <div>
          <h3>Inscripciones a carrera</h3>
          <p>Vínculo permanente del alumno; no corresponde a una matrícula por periodo.</p>
        </div>
        {canWrite ? (
          <Button onClick={() => setShowForm(true)} type="button" variant="secondary">
            <Plus size={16} /> Nueva inscripción
          </Button>
        ) : null}
      </div>
      {registrations.isPending ? <p>Cargando inscripciones…</p> : null}
      {registrations.isError ? <div className="error-banner">No se pudieron cargar las inscripciones.</div> : null}
      {registrations.data?.data.length === 0 ? <p className="operation-empty">No registra inscripciones a carrera.</p> : null}
      {registrations.data?.data.length ? (
        <ul className="detail-list">
          {registrations.data.data.map((item) => (
            <li key={item.id}>
              <div><strong>{item.carreraNombre}</strong><span>{item.estado}</span></div>
              <small>{item.planNombre} · Inicio {item.periodoInicioAnio}-{item.periodoInicioNumero}</small>
              {canWrite ? (
                <Button
                  disabled={changeState.isPending}
                  onClick={() => changeState.mutate({
                    id: item.id, estado: item.estado === 'activo' ? 'inactivo' : 'activo',
                  })}
                  type="button"
                  variant="ghost"
                >
                  {item.estado === 'activo' ? 'Inactivar' : 'Reactivar'}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {!canWrite ? <small>Tu rol permite consultar, pero no modificar inscripciones.</small> : null}
      {showForm ? (
        <aside aria-label="Nueva inscripción a carrera" className="operation-detail">
          <header>
            <div>
              <p className="eyebrow">Trayectoria académica</p>
              <h2>Nueva inscripción</h2>
              <p>Registra el vínculo permanente del alumno con una carrera y plan curricular.</p>
            </div>
            <Button aria-label="Cerrar nueva inscripción" onClick={() => setShowForm(false)} type="button" variant="ghost">
              <X size={18} />
            </Button>
          </header>
          <form className="operation-form academic-history-form" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
          <FormField error={form.formState.errors.carreraId?.message} htmlFor="registration-career" label="Carrera">
            <select className="form-select" id="registration-career" {...form.register('carreraId')}>
              <option value="">Seleccionar</option>
              {careers.data?.filter((item) => item.estado === 'activo').map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
          </FormField>
          <FormField error={form.formState.errors.planCurricularId?.message} htmlFor="registration-plan" label="Plan">
            <select className="form-select" id="registration-plan" {...form.register('planCurricularId')}>
              <option value="">Seleccionar</option>
              {plans.data?.filter((item) => item.carreraId === careerId && item.estado === 'activo').map((item) => (
                <option key={item.id} value={item.id}>{item.nombre}</option>
              ))}
            </select>
          </FormField>
          <FormField error={form.formState.errors.periodoInicioId?.message} htmlFor="registration-period" label="Periodo de inicio">
            <select className="form-select" id="registration-period" {...form.register('periodoInicioId')}>
              <option value="">Seleccionar</option>
              {eligiblePeriods.map((period) => (
                <option key={period.id} value={period.id}>{period.nombre}</option>
              ))}
            </select>
            {careerId && !periods.isPending && !currentPeriod ? (
              <small>La carrera no tiene un periodo académico vigente.</small>
            ) : null}
          </FormField>
            <div className="operation-form__actions">
              {create.error ? <div className="error-banner">{getApiErrorMessage(create.error, 'No se pudo crear la inscripción.')}</div> : null}
              <Button onClick={() => setShowForm(false)} type="button" variant="secondary">Cancelar</Button>
              <Button disabled={create.isPending} type="submit">{create.isPending ? 'Guardando…' : 'Crear inscripción'}</Button>
            </div>
          </form>
        </aside>
      ) : null}
    </div>
  );
}
