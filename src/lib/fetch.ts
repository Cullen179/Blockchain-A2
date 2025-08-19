import { API_BASE_URL } from "@/constants/api";

export async function fetchAPI<T>(
  url: string,
  options?: RequestInit & { data?: any }
) {
  const { data, ...rest } = options || {};
  const res = await fetch(`${API_BASE_URL}${url}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...(data && { body: JSON.stringify(data) }),
  });

  if (res.ok) {
    return (await res.json()) as T;
  }

  await handleResponseError(res);

  throw new Error('Failed to fetch API');
}

async function handleResponseError(res: Response): Promise<void> {
  const contentType = res.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (isJson) {
    try {
      const errorData = await res.json();

      throw new Error(
        errorData?.error || errorData?.message || 'Unknown error'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`${message}`);
    }
  } else {
    throw new Error(`${res.status} - ${res.statusText || 'Request failed'}`);
  }
}