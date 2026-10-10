import { describe, it, expect } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary static method', () => {
  it('getDerivedStateFromError memperbarui state hasError dan menyimpan error', () => {
    const error = new Error('Terjadi kesalahan render tes');
    const newState = ErrorBoundary.getDerivedStateFromError(error);

    expect(newState.hasError).toBe(true);
    expect(newState.error).toBe(error);
  });
});
