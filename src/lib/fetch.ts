export async function fetchAPI<T>(url: string, options?: RequestInit) {
    const res = await fetch(`http://localhost:3000/api${url}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!res.ok) {
        throw new Error('Failed to fetch API');
    }

    return res.json() as Promise<T>;
}
