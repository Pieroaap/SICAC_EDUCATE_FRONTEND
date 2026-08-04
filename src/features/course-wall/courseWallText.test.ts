import { describe, expect, it } from 'vitest';
import { parseWallText } from './courseWallText';

describe('parseWallText', () => {
  it('convierte enlaces HTTP y HTTPS en segmentos navegables', () => {
    expect(parseWallText('Responde en https://forms.example.com/encuesta')).toEqual([
      { value: 'Responde en ' },
      { value: 'https://forms.example.com/encuesta', href: 'https://forms.example.com/encuesta' },
    ]);
  });

  it('mantiene como texto contenido que no es una URL web', () => {
    expect(parseWallText('javascript:alert(1)')).toEqual([{ value: 'javascript:alert(1)' }]);
  });
});
