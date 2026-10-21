// API çağrıları için ince bir sarmalayıcı.

export class ApiError extends Error {
  constructor(public status: number, message: string, public code: string) {
    super(message);
    this.name = 'ApiError';
  }
}

type InitWithJson = Omit<RequestInit, 'body'> & {
  body?: unknown;
};

export async function apiFetch<T>(path: string, init: InitWithJson = {}): Promise<T> {
  const headers = new Headers(init.headers);
  let body: BodyInit | undefined;

  const method = (init.method ?? 'GET').toUpperCase();
  if (init.body !== undefined) {
    if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    body = JSON.stringify(init.body);
  } else if (method !== 'GET' && method !== 'HEAD') {
    // Gövdesiz değiştirme istekleri de JSON olarak işaretlenir.
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, {
    ...init,
    headers,
    body,
    credentials: 'include'
  });

  if (!res.ok) {
    let data: { error?: string; code?: string } = {};
    try {
      data = (await res.json()) as { error?: string; code?: string };
    } catch {
      // yut
    }
    throw new ApiError(res.status, data.error ?? 'Bilinmeyen hata', data.code ?? 'UNKNOWN');
  }

  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return (await res.json()) as T;
  return (await res.text()) as unknown as T;
}

// ---- Biçimlendirme yardımcısı ----

export type FormatRequest = {
  language: string;
  code: string;
  tabWidth?: number;
  useTabs?: boolean;
};

export type FormatResponse = { code: string };

type FormatErrorBody = {
  error: string;
  code?: string;
  line?: number;
  column?: number;
};

// Biçimlendirme hatası: 422 durumunda `line` ve `column` alanları taşınır.
export type FormatError = ApiError & {
  line?: number;
  column?: number;
};

// Sunucudaki /api/format ucunu çağırır.
// - Owner: oturum çerezi otomatik gider.
// - Edit linkiyle giren: `editToken` parametresi `X-Edit-Token` başlığına yazılır.
export async function formatCode(
  req: FormatRequest,
  editToken?: string
): Promise<FormatResponse> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (editToken) headers['X-Edit-Token'] = editToken;

  const res = await fetch('/api/format', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(req)
  });

  if (res.ok) {
    return (await res.json()) as FormatResponse;
  }

  if (res.status === 422) {
    let data: FormatErrorBody = { error: 'Biçimlendirme başarısız' };
    try {
      data = (await res.json()) as FormatErrorBody;
    } catch {
      /* yut */
    }
    const e = new ApiError(422, data.error, data.code ?? 'FORMAT_ERROR') as FormatError;
    if (data.line != null) e.line = data.line;
    if (data.column != null) e.column = data.column;
    throw e;
  }

  let data: { error?: string; code?: string } = {};
  try {
    data = (await res.json()) as { error?: string; code?: string };
  } catch {
    /* yut */
  }
  throw new ApiError(res.status, data.error ?? 'Biçimlendirme başarısız', data.code ?? 'UNKNOWN');
}