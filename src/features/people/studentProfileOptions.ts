import type { StudentState } from '../../api/types';

export type StudentBenefit = 'becado' | 'credito' | 'becado_credito' | 'normal';
export type StudentBenefitType = 'regular' | 'media_beca' | 'tercio_beca' | 'especial' | 'beca_completa';

export const studentStateOptions: Array<{ value: StudentState; label: string; description: string }> = [
  { value: 'activo', label: 'Activo', description: 'Continúa operativo para la gestión académica.' },
  { value: 'en_pausa', label: 'En pausa', description: 'Suspensión temporal sin cerrar la identidad.' },
  { value: 'retirado', label: 'Retirado', description: 'No continúa actualmente como alumno.' },
  { value: 'sin_contestar', label: 'Sin contestar', description: 'Pendiente de confirmación o contacto.' },
  { value: 'graduado', label: 'Graduado', description: 'Culminó su trayectoria como alumno.' },
];

export const benefitOptions: Array<{ value: StudentBenefit; label: string }> = [
  { value: 'normal', label: 'Normal' },
  { value: 'becado', label: 'Becado' },
  { value: 'credito', label: 'Crédito' },
  { value: 'becado_credito', label: 'Becado con crédito' },
];

export const benefitTypeOptions: Array<{ value: StudentBenefitType; label: string }> = [
  { value: 'regular', label: 'Regular' },
  { value: 'media_beca', label: 'Media beca' },
  { value: 'tercio_beca', label: 'Tercio de beca' },
  { value: 'especial', label: 'Especial' },
  { value: 'beca_completa', label: 'Beca completa' },
];

export function humanizeStudentValue(value: string) {
  return value.replaceAll('_', ' ');
}
