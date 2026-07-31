import { AxiosError } from 'axios';

import { getApiErrorMessage } from './errors';

describe('getApiErrorMessage', () => {
  it('surfaces API detail messages', () => {
    const error = new AxiosError('Request failed');
    error.response = {
      data: { detail: 'No tenant associated.' },
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config: { headers: {} as never },
    };

    expect(getApiErrorMessage(error, 'Fallback')).toBe('No tenant associated.');
  });

  it('explains network failures', () => {
    expect(getApiErrorMessage(new AxiosError('Network Error'), 'Fallback')).toContain(
      'Unable to reach the server'
    );
  });
});
