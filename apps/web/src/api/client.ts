import { ApiErrorSchema, type ApiError } from '@skem/shared';

export class ApiClientError extends Error {
  public code: string;
  public details?: Record<string, unknown>;
  public status: number;

  constructor(
    status: number,
    message: string,
    code = 'UNKNOWN_ERROR',
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const DEFAULT_ERROR_MESSAGES: Record<number, string> = {
  400: 'Permintaan tidak valid.',
  401: 'Sesi Anda telah berakhir. Silakan masuk kembali.',
  403: 'Anda tidak memiliki hak akses untuk tindakan ini.',
  404: 'Data atau halaman yang diminta tidak ditemukan.',
  409: 'Terjadi konflik data pada sistem.',
  422: 'Data yang dikirimkan tidak memenuhi syarat.',
  500: 'Terjadi gangguan pada server. Silakan coba beberapa saat lagi.',
};

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    let apiError: ApiError | null = null;
    try {
      const json = await response.json();
      const parseResult = ApiErrorSchema.safeParse(json);
      if (parseResult.success) {
        apiError = parseResult.data;
      }
    } catch {
      // Body bukan JSON atau tidak bisa diparsing
    }

    if (apiError) {
      throw new ApiClientError(
        response.status,
        apiError.error.message,
        apiError.error.code,
        apiError.error.details,
      );
    }

    const fallbackMessage =
      DEFAULT_ERROR_MESSAGES[response.status] ??
      `Terjadi kesalahan pada sistem (HTTP ${response.status}).`;

    throw new ApiClientError(response.status, fallbackMessage, `HTTP_${response.status}`);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  put: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  patch: <T>(endpoint: string, body?: unknown, options?: RequestInit) =>
    apiFetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    }),
  delete: <T>(endpoint: string, options?: RequestInit) =>
    apiFetch<T>(endpoint, { ...options, method: 'DELETE' }),
};
