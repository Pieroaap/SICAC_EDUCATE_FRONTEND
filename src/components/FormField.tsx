import type { ReactNode } from 'react';

type FormFieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
};

export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="grid gap-2">
      <label className="text-sm font-semibold text-ink" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-brand" role="alert">{error}</p>
      ) : null}
    </div>
  );
}
