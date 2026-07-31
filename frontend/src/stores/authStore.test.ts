describe('auth session restoration', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('clears a malformed saved session instead of crashing at startup', async () => {
    localStorage.setItem('user', '{invalid-json');
    localStorage.setItem('accessToken', 'stale-access-token');
    localStorage.setItem('refreshToken', 'stale-refresh-token');

    const { useAuthStore } = await import('./authStore');

    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().refreshToken).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('restores a valid saved session', async () => {
    const user = {
      id: 'user-1',
      email: 'user@example.test',
      username: 'user',
      role: 'user',
      tenant: null,
    };
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('accessToken', 'access-token');

    const { useAuthStore } = await import('./authStore');

    expect(useAuthStore.getState().user).toEqual(user);
    expect(useAuthStore.getState().accessToken).toBe('access-token');
  });
});
