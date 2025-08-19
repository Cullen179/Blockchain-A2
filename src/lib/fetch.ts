export async function fetchAPI<T>(
  url: string,
  options?: RequestInit & { data?: any }
) {
  const { data, ...rest } = options || {};
  const res = await fetch(`http://localhost:3000/api${url}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...(data && { body: JSON.stringify(data) }),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch API');
  }

  return res.json() as Promise<T>;
}
