import { API_BASE_URL } from '../api-client/auth';

export async function accountRequest<T>(path: string, body?: unknown, method = 'POST'): Promise<T> {
  const token = localStorage.getItem('teky_access_token') || sessionStorage.getItem('teky_access_token');
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || (response.status === 429 ? 'Bạn thao tác quá nhanh. Vui lòng thử lại sau một phút.' : 'Không thể thực hiện. Vui lòng thử lại.'));
  return data as T;
}
