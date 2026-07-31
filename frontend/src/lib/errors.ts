import { AxiosError } from 'axios';

type ErrorPayload = {
  detail?: string;
  non_field_errors?: string[];
  [field: string]: unknown;
};

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof AxiosError)) {
    return error instanceof Error ? error.message : fallback;
  }

  if (!error.response) {
    return 'Unable to reach the server. Check that the API is running and try again.';
  }

  const data = error.response.data;
  if (typeof data === 'string' && data.trim()) {
    return data;
  }

  const payload = data as ErrorPayload | undefined;
  if (payload?.detail) {
    return payload.detail;
  }
  if (payload?.non_field_errors?.[0]) {
    return payload.non_field_errors[0];
  }

  if (payload) {
    for (const value of Object.values(payload)) {
      if (Array.isArray(value) && typeof value[0] === 'string') {
        return value[0];
      }
      if (typeof value === 'string') {
        return value;
      }
    }
  }

  return fallback;
}
