import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useParams } from 'react-router-dom';
import { getApiErrorMessage } from '../../../api/client';
import { StatusBadge } from '../../../components/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { useAuth } from '../../auth/AuthProvider';
import { getPersonDetail, updatePerson, updateTeacherRoleStatus } from '../api/peopleApi';
import { hasActiveRole } from '../personActions';
import {
  emptyPersonValues,
  personSchema,
  toPersonFormValues,
  toPersonUpdatePayload,
  type PersonValues,
} from '../personForm';
import { PersonAccessPanel } from './PersonAccessPanel';
import { PersonFormSections } from './PersonFormSections';
import { PersonGuardiansPanel } from './PersonGuardiansPanel';
import { PersonStudentProfilePanel } from './PersonStudentProfilePanel';
import { PersonCareerEnrollmentsPanel } from './PersonCareerEnrollmentsPanel';
import { PersonAcademicRecordsPanel } from './PersonAcademicRecordsPanel';

export function PersonDetailPage() {
  const { personId = '' } = useParams();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { dirtyFields, errors, isDirty },
  } = useForm<PersonValues>({
    resolver: zodResolver(personSchema),
    defaultValues: emptyPersonValues,
  });

  const personDetail = useQuery({
    queryKey: ['person', personId],
    queryFn: () => getPersonDetail(personId),
    enabled: Boolean(personId),
  });

  useEffect(() => {
    if (personDetail.data) {
      reset(toPersonFormValues(personDetail.data));
    }
  }, [personDetail.data, reset]);

  const saveMutation = useMutation({
    mutationFn: (values: PersonValues) => updatePerson(personId, toPersonUpdatePayload(values, dirtyFields)),
    onSuccess: async () => {
      setFeedback({ type: 'success', message: 'La persona fue actualizada correctamente.' });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['people'] }),
        queryClient.invalidateQueries({ queryKey: ['students'] }),
        queryClient.invalidateQueries({ queryKey: ['teachers'] }),
        queryClient.invalidateQueries({ queryKey: ['person', personId] }),
      ]);
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'No pudimos actualizar la persona.') });
    },
  });

  const statusMutation = useMutation({
    mutationFn: (estado: 'activo' | 'inactivo') => updatePerson(personId, { estado }),
    onSuccess: async (_, estado) => {
      setFeedback({
        type: 'success',
        message: estado === 'activo'
          ? 'La persona fue reactivada correctamente.'
          : 'La persona fue inactivada correctamente.',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['people'] }),
        queryClient.invalidateQueries({ queryKey: ['students'] }),
        queryClient.invalidateQueries({ queryKey: ['teachers'] }),
        queryClient.invalidateQueries({ queryKey: ['person', personId] }),
      ]);
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'No pudimos cambiar el estado de la persona.') });
    },
  });

  const teacherStatusMutation = useMutation({
    mutationFn: (input: { targetId: string; estado: 'activo' | 'inactivo' }) => (
      updateTeacherRoleStatus(input.targetId, { estado: input.estado })
    ),
    onSuccess: async (_, input) => {
      setFeedback({
        type: 'success',
        message: input.estado === 'activo'
          ? 'El rol Profesor fue reactivado correctamente.'
          : 'El rol Profesor fue inactivado correctamente.',
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['people'] }),
        queryClient.invalidateQueries({ queryKey: ['teachers'] }),
        queryClient.invalidateQueries({ queryKey: ['person', input.targetId] }),
      ]);
    },
    onError: (error) => {
      setFeedback({ type: 'error', message: getApiErrorMessage(error, 'No pudimos actualizar el rol Profesor.') });
    },
  });

  const onSubmit = handleSubmit((values) => {
    setFeedback(null);
    saveMutation.mutate(values);
  });

  if (personDetail.isError) {
    return (
      <main className="page-shell table-state is-error">
        <h1>No pudimos cargar la ficha</h1>
        <p>Revisa la conexión o vuelve al listado para intentarlo otra vez.</p>
        <Button asChild variant="secondary"><Link to="/personas">Volver a Personas</Link></Button>
      </main>
    );
  }

  if (personDetail.isPending || !personDetail.data) {
    return <main className="page-shell table-state">Cargando persona…</main>;
  }

  const person = personDetail.data;
  const actorRoles = profile?.roles.map((role) => role.codigo) ?? [];
  const personName = [person.apellidoPaterno, person.apellidoMaterno, person.nombres]
    .filter(Boolean)
    .join(' ');
  const isStudent = hasActiveRole(person, 'ALUMNO');
  const teacherRole = person.roles.find((role) => role.codigo === 'PROFESOR' && !role.fechaFin);
  const canUpdateTeacherRole = actorRoles.some((role) => (
    role === 'ADMINISTRADOR_SISTEMA'
    || role === 'DIRECTOR_ACADEMICO'
    || role === 'GESTOR_ACADEMICO'
  ));
  const nextTeacherStatus = teacherRole?.estado === 'activo' ? 'inactivo' : 'activo';
  const nextStatus = person.estado === 'activo' ? 'inactivo' : 'activo';
  const statusActionLabel = nextStatus === 'inactivo' ? 'Inactivar registro' : 'Reactivar registro';
  const statusPrompt = nextStatus === 'inactivo'
    ? `Se marcará a ${person.nombres} ${person.apellidoPaterno} como inactivo.`
    : `Se reactivará a ${person.nombres} ${person.apellidoPaterno}.`;

  function toggleStatus() {
    if (!window.confirm(`${statusPrompt} ¿Deseas continuar?`)) return;
    setFeedback(null);
    statusMutation.mutate(nextStatus);
  }

  return (
    <main className="page-shell form-page detail-page">
      <Link className="back-link" to="/personas">
        <ArrowLeft size={17} />
        Volver a Personas
      </Link>

      <header className="page-heading detail-heading">
        <div>
          <p className="eyebrow">Identidad</p>
        </div>
        <StatusBadge active={person.estado === 'activo'} />
      </header>

      {feedback ? (
        <div className={feedback.type === 'error' ? 'error-banner' : 'success-banner'} role="status">
          {feedback.message}
        </div>
      ) : null}

      <section className="person-summary-grid" aria-label="Resumen de la persona">
        <article className="person-summary-card person-summary-card--hero">
          <p className="eyebrow">Ficha</p>
          <strong>{personName}</strong>
          <span>{person.estado === 'activo' ? 'Registro activo' : 'Registro inactivo'}</span>
          <dl className="person-summary-card__legacy">
            <div>
              <dt>Correo</dt>
              <dd>{person.correo ?? 'Sin correo registrado'}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{person.telefono ?? 'Sin teléfono registrado'}</dd>
            </div>
          </dl>
        </article>

        <article className="person-summary-card person-summary-card--data">
          <p className="eyebrow">Datos</p>
          <dl>
            <div>
              <dt>{person.tipoDocumento.replaceAll('_', ' ')}</dt>
              <dd>{person.numeroDocumento}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{person.correo ?? 'Sin correo registrado'}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{person.telefono ?? 'Sin teléfono registrado'}</dd>
            </div>
            <div>
              <dt>Acceso</dt>
              <dd>{person.tieneAcceso ? 'Cuenta habilitada' : 'Sin acceso al sistema'}</dd>
            </div>
          </dl>
          <strong>{person.tieneAcceso ? 'Cuenta habilitada' : 'Sin acceso al sistema'}</strong>
          <span>
            {person.tieneAcceso
              ? 'Puede autenticarse según sus credenciales y roles vigentes.'
              : 'La identidad existe, pero todavía no tiene cuenta operativa.'}
          </span>
        </article>

        <article className="person-summary-card">
          <p className="eyebrow">Roles</p>
          <div className="role-list">
            {person.roles.length > 0
              ? person.roles.map((role) => (
                <span key={`${role.codigo}-${role.fechaInicio}`}>
                  {role.nombre}
                </span>
              ))
              : <em>Sin rol asignado</em>}
          </div>
          <span className="person-summary-note">
            {person.roles.length > 0
              ? 'Los roles se administrarán en sus módulos específicos.'
              : 'Aún no tiene relaciones de rol registradas.'}
          </span>
        </article>
      </section>

      

      <div className="entity-form operational-sections" aria-label="Datos operativos">
        <section>
          <header>
            <span>03</span>
            <div>
              <h2>Rol y acceso</h2>
              <p>Roles asignados y cuenta operativa de la persona.</p>
            </div>
          </header>
          <div className="detail-grid">
            <div className="detail-panel">
              <h3>Asignaciones de rol</h3>
              {person.roles.length === 0 ? (
                <p>No hay roles asignados.</p>
              ) : (
                <ul className="detail-list">
                  {person.roles.map((role) => (
                    <li key={`${role.codigo}-${role.fechaInicio}`}>
                      <div>
                        <strong>{role.nombre}</strong>
                        <span>{role.estado === 'activo' ? 'Activo' : 'Inactivo'}</span>
                      </div>
                      <small>
                        Desde {role.fechaInicio}
                        {role.fechaFin ? ` · Hasta ${role.fechaFin}` : ''}
                      </small>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <PersonAccessPanel
              actorPersonaId={profile?.personaId}
              actorRoles={actorRoles}
              onFeedback={setFeedback}
              person={person}
            />

            {teacherRole ? (
              <div className="detail-panel action-panel">
                <h3>Estado docente</h3>
                <p>
                  El listado de profesores usa el estado del rol Profesor, independiente del estado base de la persona.
                </p>
                <p>
                  Estado actual: <strong>{teacherRole.estado === 'activo' ? 'Activo' : 'Inactivo'}</strong>
                </p>
                <Button
                  disabled={!canUpdateTeacherRole || teacherStatusMutation.isPending}
                  onClick={() => {
                    setFeedback(null);
                    teacherStatusMutation.mutate({ targetId: person.id, estado: nextTeacherStatus });
                  }}
                  type="button"
                  variant="secondary"
                >
                  {teacherStatusMutation.isPending ? <LoaderCircle className="animate-spin" size={17} /> : null}
                  {nextTeacherStatus === 'activo' ? 'Reactivar profesor' : 'Inactivar profesor'}
                </Button>
                {!canUpdateTeacherRole ? <small>No tienes permisos para cambiar el estado docente.</small> : null}
              </div>
            ) : null}
          </div>
        </section>

        {isStudent ? (
          <>
            <section>
              <header>
                <span>04</span>
                <div>
                  <h2>Alumno</h2>
                  <p>Estado académico, beneficio y datos propios del perfil de alumno.</p>
                </div>
              </header>
              <div className="detail-grid detail-grid--single">
                <PersonStudentProfilePanel
                  actorRoles={actorRoles}
                  onFeedback={setFeedback}
                  person={person}
                />
              </div>
            </section>

            <section>
              <header>
                <span>05</span>
                <div>
                  <h2>Tutor</h2>
                  <p>Relaciones de tutoría asociadas al alumno, cuando correspondan.</p>
                </div>
              </header>
              <div className="detail-grid detail-grid--single">
                <PersonGuardiansPanel
                  actorRoles={actorRoles}
                  onFeedback={setFeedback}
                  person={person}
                />
              </div>
            </section>

            <section>
              <header>
                <span>06</span>
                <div>
                  <h2>Trayectoria académica</h2>
                  <p>Inscripciones permanentes y cursos históricos reconocidos.</p>
                </div>
              </header>
              <div className="detail-grid">
                <PersonCareerEnrollmentsPanel actorRoles={actorRoles} personId={person.id} />
                <PersonAcademicRecordsPanel actorRoles={actorRoles} personId={person.id} />
              </div>
            </section>
          </>
        ) : null}
      </div>
      <form className="entity-form" noValidate onSubmit={onSubmit}>
        <PersonFormSections errors={errors} register={register} />

        <footer className="form-actions form-actions--split">
          <Button
            className="status-toggle-button"
            disabled={statusMutation.isPending}
            onClick={toggleStatus}
            type="button"
            variant="ghost"
          >
            {statusMutation.isPending ? <LoaderCircle className="animate-spin" size={18} /> : null}
            {statusActionLabel}
          </Button>

          <div className="form-actions__primary">
            <Button asChild variant="secondary"><Link to="/personas">Volver</Link></Button>
            <Button disabled={saveMutation.isPending || !isDirty} type="submit">
              {saveMutation.isPending ? <LoaderCircle className="animate-spin" size={18} /> : null}
              Guardar cambios
            </Button>
          </div>
        </footer>
      </form>
    </main>
  );
}
