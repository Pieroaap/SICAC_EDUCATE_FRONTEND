import { beforeEach, describe, expect, it } from 'vitest';
import { clearSession, readSession, writeSession } from './session';

describe('session storage', () => {
  beforeEach(() => sessionStorage.clear());

  it('conserva una sesión válida durante la pestaña actual', () => {
    const tokens = {
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresAt: 123,
    };
    writeSession(tokens);
    expect(readSession()).toEqual(tokens);
  });

  it('descarta datos dañados', () => {
    sessionStorage.setItem('sicac.session.v1', '{"accessToken":7}');
    expect(readSession()).toBeNull();
    expect(sessionStorage.getItem('sicac.session.v1')).toBeNull();
  });

  it('elimina la sesión', () => {
    writeSession({ accessToken: 'access', refreshToken: 'refresh' });
    clearSession();
    expect(readSession()).toBeNull();
  });
});
