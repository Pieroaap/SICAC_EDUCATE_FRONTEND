import type { ReactNode } from 'react';
import logoWhite from '../../../assets/brand/logo-white.png';

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell">
      <section className="auth-stage" aria-label="Club de Arte y Cultura">
        <img
          alt="Club de Arte & Cultura"
          className="auth-stage__logo"
          src={logoWhite}
        />
        <div className="auth-stage__message">
          <p>El escenario es tuyo.</p>
          <p>Nosotros te acompañamos.</p>
          <span>Sistema Integral del Club de Arte & Cultura</span>
        </div>
        <p className="auth-stage__footer">
          © {new Date().getFullYear()} Club de Arte & Cultura
        </p>
      </section>
      <section className="auth-form-panel">
        <div className="auth-mobile-brand">
          <img alt="Club de Arte & Cultura" src={logoWhite} />
        </div>
        <div className="auth-form-wrap">{children}</div>
      </section>
    </main>
  );
}
