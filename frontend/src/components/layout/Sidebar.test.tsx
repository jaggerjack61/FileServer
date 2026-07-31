import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types';

import { Sidebar } from './Sidebar';

function renderFor(user: User) {
  useAuthStore.setState({ user });
  return render(
    <MemoryRouter>
      <Sidebar collapsed={false} onToggle={() => undefined} />
    </MemoryRouter>
  );
}

const activeTenant = {
  id: 'tenant-1',
  name: 'Tenant',
  slug: 'tenant',
  storage_quota: 1000,
  storage_used: 0,
  is_active: true,
  created_at: new Date().toISOString(),
};

describe('Sidebar role navigation', () => {
  it('fills the available layout height', () => {
    renderFor({
      id: 'member',
      email: 'member@example.test',
      username: 'member',
      role: 'user',
      tenant: activeTenant,
    });

    expect(screen.getByRole('complementary')).toHaveClass('h-full');
  });

  it('hides tenant actions from a platform administrator without a tenant', () => {
    renderFor({
      id: 'admin',
      email: 'admin@example.test',
      username: 'admin',
      role: 'admin',
      is_superuser: true,
      tenant: null,
    });

    expect(screen.queryByText('My Files')).not.toBeInTheDocument();
    expect(screen.queryByText('Trash')).not.toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Tenants')).toBeInTheDocument();
    expect(screen.getByText('Activity Log')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'API Keys' })).toHaveAttribute(
      'href',
      '/admin/api-keys'
    );
  });

  it('shows API-key management to an active tenant administrator', () => {
    renderFor({
      id: 'tenant-admin',
      email: 'owner@example.test',
      username: 'owner',
      role: 'admin',
      tenant: activeTenant,
    });

    expect(screen.getByText('My Files')).toBeInTheDocument();
    expect(screen.getByText('Trash')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'API Keys' })).toHaveAttribute(
      'href',
      '/api-keys'
    );
    expect(screen.getByText('0 B of 1000 B used (0%)')).toBeInTheDocument();
    expect(screen.queryByText('Tenants')).not.toBeInTheDocument();
  });

  it('hides API-key management from a tenant member', () => {
    renderFor({
      id: 'member',
      email: 'member@example.test',
      username: 'member',
      role: 'user',
      tenant: activeTenant,
    });

    expect(screen.getByText('My Files')).toBeInTheDocument();
    expect(screen.getByText('Trash')).toBeInTheDocument();
    expect(screen.queryByText('API Keys')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
