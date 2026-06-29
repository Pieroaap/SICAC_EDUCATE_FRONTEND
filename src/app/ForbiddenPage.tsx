import { Link } from 'react-router-dom';

export function ForbiddenPage() {
  return (
    <main className="page-shell">
      <section className="table-state">
        <p className="eyebrow">Permiso insuficiente</p>
        <h1>No puedes acceder a esta sección</h1>
        <p>Tu sesión sigue activa. Vuelve a un espacio disponible para tus roles.</p>
        <Link to="/">Ir al panel general</Link>
      </section>
    </main>
  );
}
