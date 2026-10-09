import { describe, expect, it } from 'vitest';
import { API_PREFIX } from './index';

describe('API_PREFIX', () => {
  it('berupa path absolut tanpa garis miring di akhir', () => {
    expect(API_PREFIX).toBe('/api');
  });
});
