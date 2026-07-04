import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Library, Plus, Users, X } from 'lucide-react';
import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { getApiErrorMessage } from '../../../api/client';
import type { ScheduledWorkshop, ScheduledWorkshopState } from '../../../api/types';
import { FormField } from '../../../components/FormField';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { useDebouncedValue } from '../../../lib/useDebouncedValue';
import { getPeople } from '../../people/api/peopleApi';
import {
  changeScheduledWorkshopState, changeWorkshopParticipantState, createScheduledWorkshop,
  createWorkshop, enrollWorkshopParticipant, getScheduledWorkshops, getWorkshopParticipants,
  getWorkshopResponsibles, getWorkshops, type BasicPerson, type WorkshopResponsible,
} from '../api/workshopsApi';
import {
  personSchema, scheduledWorkshopSchema, workshopSchema,
  type ScheduledWorkshopValues, type WorkshopValues,
} from '../workshopForms';

const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'] as const;
const labels: Record<ScheduledWorkshopState, string> = {
  borrador: 'Borrador', abierto: 'Abierto', en_curso: 'En curso',
  finalizado: 'Finalizado', cancelado: 'Cancelado',
};

export function WorkshopsPage() {
  const [tab, setTab] = useState<'catalogo' | 'programados'>('programados');
  return (
    <main className="page-shell workshops-page">
      <header className="page-heading">
        <div><p className="eyebrow">Operación cultural</p><h1>Talleres</h1></div>
      </header>
      <nav aria-label="Secciones de talleres" className="workshop-tabs">
        <button
          aria-current={tab === 'programados' ? 'page' : undefined}
          className={tab === 'programados' ? 'is-active' : ''}
          onClick={() => setTab('programados')}
          type="button"
        >
          <span className="workshop-tabs__icon"><CalendarDays size={18} /></span>
          <span><strong>Talleres programados</strong><small>Fechas, cupos y participantes</small></span>
        </button>
        <button
          aria-current={tab === 'catalogo' ? 'page' : undefined}
          className={tab === 'catalogo' ? 'is-active' : ''}
          onClick={() => setTab('catalogo')}
          type="button"
        >
          <span className="workshop-tabs__icon"><Library size={18} /></span>
          <span><strong>Catálogo de talleres</strong><small>Definiciones reutilizables</small></span>
        </button>
      </nav>
      {tab === 'catalogo' ? <WorkshopCatalog /> : <ScheduledWorkshops />}
    </main>
  );
}

function WorkshopCatalog() {
  const client = useQueryClient();
  const [show, setShow] = useState(false);
  const query = useQuery({ queryKey: ['workshops', 'catalog'], queryFn: () => getWorkshops({ pageSize: 100 }) });
  const form = useForm<WorkshopValues>({ resolver: zodResolver(workshopSchema), defaultValues: { codigo: '', nombre: '', descripcion: '' } });
  const mutation = useMutation({
    mutationFn: createWorkshop,
    onSuccess: async () => { form.reset(); setShow(false); await client.invalidateQueries({ queryKey: ['workshops', 'catalog'] }); },
  });
  return (
    <section className="operation-section">
      <div className="operation-section__heading"><div><h2>Catálogo de talleres</h2><p>Definiciones reutilizables para nuevas programaciones.</p></div><Button onClick={() => setShow((value) => !value)}><Plus size={16} />Nuevo taller</Button></div>
      {show ? <form className="operation-form" onSubmit={form.handleSubmit((value) => mutation.mutate(value))}>
        <FormField error={form.formState.errors.codigo?.message} htmlFor="workshop-code" label="Código"><Input id="workshop-code" {...form.register('codigo')} /></FormField>
        <FormField error={form.formState.errors.nombre?.message} htmlFor="workshop-name" label="Nombre"><Input id="workshop-name" {...form.register('nombre')} /></FormField>
        <FormField error={form.formState.errors.descripcion?.message} htmlFor="workshop-description" label="Descripción"><Input id="workshop-description" {...form.register('descripcion')} /></FormField>
        <div className="operation-form__actions">{mutation.error ? <div className="error-banner">{getApiErrorMessage(mutation.error, 'No se pudo crear el taller.')}</div> : null}<Button variant="secondary" onClick={() => setShow(false)}>Cancelar</Button><Button disabled={mutation.isPending} type="submit">Guardar</Button></div>
      </form> : null}
      <TableState loading={query.isPending} error={query.isError} empty={!query.data?.data.length}>
        {query.data?.data.map((row) => <article className="workshop-card" key={row.id}><span>{row.codigo}</span><h3>{row.nombre}</h3><p>{row.descripcion || 'Sin descripción.'}</p></article>)}
      </TableState>
    </section>
  );
}

function ScheduledWorkshops() {
  const client = useQueryClient();
  const [show, setShow] = useState(false);
  const [selected, setSelected] = useState<ScheduledWorkshop | null>(null);
  const [state, setState] = useState<ScheduledWorkshopState | ''>('');
  const [responsibleSearch, setResponsibleSearch] = useState('');
  const [responsibleOpen, setResponsibleOpen] = useState(false);
  const debouncedResponsibleSearch = useDebouncedValue(responsibleSearch.trim(), 250);
  const catalog = useQuery({ queryKey: ['workshops', 'catalog'], queryFn: () => getWorkshops({ pageSize: 100 }) });
  const responsibles = useQuery({
    queryKey: ['workshops', 'responsibles', debouncedResponsibleSearch],
    queryFn: () => getWorkshopResponsibles({ pageSize: 20, search: debouncedResponsibleSearch || undefined }),
    enabled: responsibleOpen,
  });
  const query = useQuery({ queryKey: ['workshops', 'scheduled', state], queryFn: () => getScheduledWorkshops({ pageSize: 100, estado: state || undefined }) });
  const form = useForm<ScheduledWorkshopValues>({
    resolver: zodResolver(scheduledWorkshopSchema),
    defaultValues: {
      tallerId: '', responsablePersonaId: '', fechaInicio: '', fechaFin: '',
      modalidad: 'presencial', ubicacion: '', costo: '', cupoMaximo: 1,
      horarios: [{ dia: 'lunes', horaInicio: '18:00', horaFin: '20:00' }],
    },
  });
  const schedules = useFieldArray({ control: form.control, name: 'horarios' });
  const create = useMutation({
    mutationFn: (values: ScheduledWorkshopValues) => createScheduledWorkshop({
      ...values, responsablePersonaId: values.responsablePersonaId || undefined,
      costo: values.costo || null,
    }),
    onSuccess: async () => { form.reset(); setShow(false); await client.invalidateQueries({ queryKey: ['workshops', 'scheduled'] }); },
  });
  return (
    <section className="operation-section">
      <div className="operation-section__heading"><div><h2>Talleres programados</h2></div><Button onClick={() => setShow((value) => !value)}><CalendarDays size={16} />Programar taller</Button></div>
      <label className="select-filter"><span>Estado</span><select className="form-select" onChange={(event) => setState(event.target.value as ScheduledWorkshopState | '')} value={state}><option value="">Todos</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      {show ? <form className="workshop-program-form" onSubmit={form.handleSubmit((value) => create.mutate(value))}>
        <FormField error={form.formState.errors.tallerId?.message} htmlFor="scheduled-workshop" label="Taller"><select className="form-select" id="scheduled-workshop" {...form.register('tallerId')}><option value="">Seleccionar</option>{catalog.data?.data.map((item) => <option key={item.id} value={item.id}>{item.codigo} · {item.nombre}</option>)}</select></FormField>
        <FormField error={form.formState.errors.responsablePersonaId?.message} htmlFor="scheduled-responsible" label="Responsable registrado">
          <ResponsibleCombobox
            inputId="scheduled-responsible"
            loading={responsibles.isFetching}
            onOpenChange={setResponsibleOpen}
            onSearchChange={(value) => {
              setResponsibleSearch(value);
              form.setValue('responsablePersonaId', '', { shouldValidate: false });
            }}
            onSelect={(person) => {
              form.setValue('responsablePersonaId', person.id, { shouldValidate: true });
              setResponsibleSearch(`${person.apellidoPaterno}, ${person.nombres} · ${person.numeroDocumento}`);
              setResponsibleOpen(false);
            }}
            open={responsibleOpen}
            options={responsibles.data?.data ?? []}
            search={responsibleSearch}
          />
        </FormField>
        <FormField error={form.formState.errors.fechaInicio?.message} htmlFor="scheduled-start" label="Fecha inicial"><Input id="scheduled-start" type="date" {...form.register('fechaInicio')} /></FormField>
        <FormField error={form.formState.errors.fechaFin?.message} htmlFor="scheduled-end" label="Fecha final"><Input id="scheduled-end" type="date" {...form.register('fechaFin')} /></FormField>
        <FormField error={form.formState.errors.modalidad?.message} htmlFor="scheduled-mode" label="Modalidad"><select className="form-select" id="scheduled-mode" {...form.register('modalidad')}><option value="presencial">Presencial</option><option value="virtual">Virtual</option><option value="hibrido">Híbrido</option></select></FormField>
        <FormField error={form.formState.errors.ubicacion?.message} htmlFor="scheduled-location" label="Ubicación o enlace"><Input id="scheduled-location" {...form.register('ubicacion')} /></FormField>
        <FormField error={form.formState.errors.costo?.message} htmlFor="scheduled-cost" label="Costo"><Input id="scheduled-cost" inputMode="decimal" {...form.register('costo')} /></FormField>
        <FormField error={form.formState.errors.cupoMaximo?.message} htmlFor="scheduled-capacity" label="Cupo máximo"><Input id="scheduled-capacity" min={1} type="number" {...form.register('cupoMaximo', { valueAsNumber: true })} /></FormField>
        <fieldset className="schedule-fieldset"><legend>Horario semanal</legend>{schedules.fields.map((field, index) => <div className="schedule-row" key={field.id}><select className="form-select" {...form.register(`horarios.${index}.dia`)}>{days.map((day) => <option key={day} value={day}>{day}</option>)}</select><Input aria-label="Hora inicial" type="time" {...form.register(`horarios.${index}.horaInicio`)} /><Input aria-label="Hora final" type="time" {...form.register(`horarios.${index}.horaFin`)} /><Button aria-label="Quitar horario" disabled={schedules.fields.length === 1} onClick={() => schedules.remove(index)} variant="ghost"><X size={16} /></Button></div>)}<Button onClick={() => schedules.append({ dia: 'lunes', horaInicio: '18:00', horaFin: '20:00' })} variant="secondary"><Plus size={15} />Añadir bloque</Button></fieldset>
        <div className="operation-form__actions">{create.error ? <div className="error-banner">{getApiErrorMessage(create.error, 'No se pudo programar el taller.')}</div> : null}<Button onClick={() => setShow(false)} variant="secondary">Cancelar</Button><Button disabled={create.isPending} type="submit">Guardar borrador</Button></div>
      </form> : null}
      <TableState loading={query.isPending} error={query.isError} empty={!query.data?.data.length}>
        {query.data?.data.map((row) => <article className="scheduled-workshop-card" key={row.id}><div><span className={`workshop-state is-${row.estado}`}>{labels[row.estado]}</span><h3>{row.tallerNombre}</h3><p>{row.fechaInicio} → {row.fechaFin} · {row.modalidad}</p></div><div className="capacity-mark"><strong>{row.vacantes}</strong><span>vacantes de {row.cupoMaximo}</span></div><Button onClick={() => setSelected(row)} variant="secondary"><Users size={16} />Gestionar</Button></article>)}
      </TableState>
      {selected ? <WorkshopDetail value={selected} onClose={() => setSelected(null)} /> : null}
    </section>
  );
}

function ResponsibleCombobox({
  inputId, loading, onOpenChange, onSearchChange, onSelect, open, options, search,
}: {
  inputId: string;
  loading: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelect: (person: WorkshopResponsible) => void;
  open: boolean;
  options: WorkshopResponsible[];
  search: string;
}) {
  const listboxId = `${inputId}-options`;
  return (
    <div className="workshop-combobox">
      <Input
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        autoComplete="off"
        id={inputId}
        onBlur={() => window.setTimeout(() => onOpenChange(false), 100)}
        onChange={(event) => {
          onSearchChange(event.target.value);
          onOpenChange(true);
        }}
        onFocus={() => onOpenChange(true)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onOpenChange(false);
        }}
        placeholder="Buscar por nombre, apellido o documento"
        role="combobox"
        value={search}
      />
      {open ? (
        <div className="workshop-combobox__options" id={listboxId} role="listbox">
          {loading ? <span className="workshop-combobox__state">Buscando personas…</span> : null}
          {!loading && options.length === 0 ? (
            <span className="workshop-combobox__state">No hay responsables que coincidan.</span>
          ) : null}
          {!loading ? options.map((person) => (
            <button
              key={person.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(person)}
              role="option"
              type="button"
            >
              <strong>{person.apellidoPaterno}, {person.nombres}</strong>
              <small>{person.numeroDocumento}</small>
            </button>
          )) : null}
        </div>
      ) : null}
    </div>
  );
}

function WorkshopDetail({ value, onClose }: { value: ScheduledWorkshop; onClose: () => void }) {
  const client = useQueryClient();
  const [showPerson, setShowPerson] = useState(false);
  const [existingId, setExistingId] = useState('');
  const participants = useQuery({ queryKey: ['workshops', 'participants', value.id], queryFn: () => getWorkshopParticipants(value.id) });
  const people = useQuery({ queryKey: ['people', 'workshop-enrollment'], queryFn: () => getPeople({ page: 1, pageSize: 20 }) });
  const personForm = useForm<BasicPerson>({ resolver: zodResolver(personSchema), defaultValues: { tipoDocumento: 'dni', numeroDocumento: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '', correo: '', telefono: '' } });
  const refresh = async () => Promise.all([
    client.invalidateQueries({ queryKey: ['workshops', 'participants', value.id] }),
    client.invalidateQueries({ queryKey: ['workshops', 'scheduled'] }),
  ]);
  const enroll = useMutation({
    mutationFn: () => enrollWorkshopParticipant(value.id, showPerson ? { person: personForm.getValues() } : { personaId: existingId }),
    onSuccess: async () => { setExistingId(''); personForm.reset(); await refresh(); },
  });
  const participantState = useMutation({
    mutationFn: ({ id, estado, motivo }: { id: string; estado: 'activa' | 'retirada'; motivo: string }) => changeWorkshopParticipantState(id, estado, motivo),
    onSuccess: refresh,
  });
  const transition = useMutation({
    mutationFn: ({ estado, motivo }: { estado: ScheduledWorkshopState; motivo?: string }) => changeScheduledWorkshopState(value.id, estado, motivo),
    onSuccess: async () => { await refresh(); onClose(); },
  });
  const next = value.estado === 'borrador' ? 'abierto' : value.estado === 'abierto' ? 'en_curso' : value.estado === 'en_curso' ? 'finalizado' : null;
  return <aside aria-label="Gestión del taller" className="operation-detail workshop-detail">
    <header><div><p className="eyebrow">{labels[value.estado]}</p><h2>{value.tallerNombre}</h2><p>{value.responsableApellidoPaterno}, {value.responsableNombres} · {value.ubicacion}</p></div><Button aria-label="Cerrar" onClick={onClose} variant="ghost"><X size={18} /></Button></header>
    <div className="workshop-detail__actions">{next ? <Button disabled={transition.isPending} onClick={() => window.confirm(`¿Cambiar a ${labels[next]}?`) && transition.mutate({ estado: next })}>Pasar a {labels[next]}</Button> : null}{!['finalizado', 'cancelado'].includes(value.estado) ? <Button variant="secondary" onClick={() => { const motivo = window.prompt('Motivo de cancelación'); if (motivo) transition.mutate({ estado: 'cancelado', motivo }); }}>Cancelar programación</Button> : null}</div>
    {value.estado === 'abierto' ? <section className="workshop-enroll"><h3>Inscribir participante</h3><label><input checked={showPerson} onChange={(event) => setShowPerson(event.target.checked)} type="checkbox" />Registrar una persona externa</label>{showPerson ? <div className="person-grid"><select className="form-select" {...personForm.register('tipoDocumento')}><option value="dni">DNI</option><option value="pasaporte">Pasaporte</option><option value="carnet_extranjeria">Carnet de extranjería</option><option value="otro">Otro</option></select><Input placeholder="Documento" {...personForm.register('numeroDocumento')} /><Input placeholder="Nombres" {...personForm.register('nombres')} /><Input placeholder="Apellido paterno" {...personForm.register('apellidoPaterno')} /></div> : <select className="form-select" onChange={(event) => setExistingId(event.target.value)} value={existingId}><option value="">Seleccionar persona</option>{people.data?.data.map((item) => <option key={item.id} value={item.id}>{item.apellidoPaterno}, {item.nombres} · {item.numeroDocumento}</option>)}</select>}<Button disabled={enroll.isPending || (!showPerson && !existingId)} onClick={() => enroll.mutate()}>Inscribir</Button>{enroll.error ? <div className="error-banner">{getApiErrorMessage(enroll.error, 'No se pudo inscribir.')}</div> : null}</section> : null}
    <section><h3>Participantes ({participants.data?.pagination.total ?? 0})</h3>{participants.data?.data.length ? <div className="roster-list">{participants.data.data.map((row) => <div className="roster-row" key={row.id}><span><strong>{row.apellidoPaterno}, {row.nombres}</strong><small>{row.numeroDocumento} · {row.estado}</small></span>{row.estado === 'activa' ? <Button variant="ghost" onClick={() => { const motivo = window.prompt('Motivo del retiro'); if (motivo) participantState.mutate({ id: row.id, estado: 'retirada', motivo }); }}>Retirar</Button> : row.estado === 'retirada' && value.estado === 'abierto' ? <Button variant="ghost" onClick={() => { const motivo = window.prompt('Motivo de reactivación'); if (motivo) participantState.mutate({ id: row.id, estado: 'activa', motivo }); }}>Reactivar</Button> : null}</div>)}</div> : <p className="operation-empty">Aún no hay participantes.</p>}</section>
  </aside>;
}

function TableState({ children, empty, error, loading }: { children: React.ReactNode; empty: boolean; error: boolean; loading: boolean }) {
  if (loading) return <div className="table-state">Cargando talleres…</div>;
  if (error) return <div className="table-state is-error">No se pudo cargar la información.</div>;
  if (empty) return <div className="table-state"><h2>No hay registros todavía.</h2></div>;
  return <div className="workshop-grid">{children}</div>;
}
