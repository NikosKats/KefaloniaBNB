// tests/unit/permissions.test.ts
// Pure function tests for role-based access control rules.
// These functions mirror the logic in middleware and API route guards.

import { describe, it, expect } from 'vitest';
import type { Role } from '../types/domain';

// ─── Permission predicates ─────────────────────────────────────────────────────
// These are pure functions extracted from the middleware / API guards.

function canAccessAdminPanel(role: Role): boolean {
  return ['admin', 'super_admin', 'property_owner'].includes(role);
}

function canAccessOwnerPortal(role: Role): boolean {
  return ['property_owner', 'admin', 'super_admin'].includes(role);
}

function canAccessCleanerPortal(role: Role): boolean {
  return ['cleaner', 'admin', 'super_admin'].includes(role);
}

function canActivateListing(role: Role): boolean {
  return ['admin', 'super_admin'].includes(role);
}

function canApproveCleaner(role: Role): boolean {
  return ['admin', 'super_admin'].includes(role);
}

function canEnableTestMode(role: Role): boolean {
  return role === 'super_admin';
}

function canResolveDispute(role: Role): boolean {
  return ['admin', 'super_admin'].includes(role);
}

function canViewOtherOwnerData(
  requestingUserId: string,
  resourceOwnerId: string,
  role: Role,
): boolean {
  if (['admin', 'super_admin'].includes(role)) return true;
  return requestingUserId === resourceOwnerId;
}

function canViewOtherCleanerJob(
  requestingCleanerId: string,
  jobCleanerId: string,
  role: Role,
): boolean {
  if (['admin', 'super_admin'].includes(role)) return true;
  return requestingCleanerId === jobCleanerId;
}

// ─── Admin panel access ───────────────────────────────────────────────────────

describe('Admin panel access', () => {

  it('super_admin can access admin panel', () => {
    expect(canAccessAdminPanel('super_admin')).toBe(true);
  });

  it('admin can access admin panel', () => {
    expect(canAccessAdminPanel('admin')).toBe(true);
  });

  it('property_owner can access admin panel (owner portal)', () => {
    expect(canAccessAdminPanel('property_owner')).toBe(true);
  });

  it('cleaner cannot access admin panel', () => {
    expect(canAccessAdminPanel('cleaner')).toBe(false);
  });

  it('guest cannot access admin panel', () => {
    expect(canAccessAdminPanel('guest')).toBe(false);
  });

});

// ─── Portal access ────────────────────────────────────────────────────────────

describe('Portal access', () => {

  it('property_owner can access owner portal', () => {
    expect(canAccessOwnerPortal('property_owner')).toBe(true);
  });

  it('cleaner cannot access owner portal', () => {
    expect(canAccessOwnerPortal('cleaner')).toBe(false);
  });

  it('guest cannot access owner portal', () => {
    expect(canAccessOwnerPortal('guest')).toBe(false);
  });

  it('cleaner can access cleaner portal', () => {
    expect(canAccessCleanerPortal('cleaner')).toBe(true);
  });

  it('property_owner cannot access cleaner portal', () => {
    expect(canAccessCleanerPortal('property_owner')).toBe(false);
  });

  it('guest cannot access cleaner portal', () => {
    expect(canAccessCleanerPortal('guest')).toBe(false);
  });

  it('admin can access both portals', () => {
    expect(canAccessOwnerPortal('admin')).toBe(true);
    expect(canAccessCleanerPortal('admin')).toBe(true);
  });

});

// ─── Listing management ───────────────────────────────────────────────────────

describe('Listing activation', () => {

  it('super_admin can activate listings', () => {
    expect(canActivateListing('super_admin')).toBe(true);
  });

  it('admin can activate listings', () => {
    expect(canActivateListing('admin')).toBe(true);
  });

  it('property_owner cannot activate own listing', () => {
    expect(canActivateListing('property_owner')).toBe(false);
  });

  it('cleaner cannot activate listings', () => {
    expect(canActivateListing('cleaner')).toBe(false);
  });

  it('guest cannot activate listings', () => {
    expect(canActivateListing('guest')).toBe(false);
  });

});

// ─── Test mode ────────────────────────────────────────────────────────────────

describe('Test mode', () => {

  it('only super_admin can enable test mode', () => {
    expect(canEnableTestMode('super_admin')).toBe(true);
  });

  const nonSuperAdminRoles: Role[] = ['guest', 'property_owner', 'cleaner', 'admin'];
  nonSuperAdminRoles.forEach(role => {
    it(`${role} cannot enable test mode`, () => {
      expect(canEnableTestMode(role)).toBe(false);
    });
  });

});

// ─── Data isolation ───────────────────────────────────────────────────────────

describe('Owner data isolation', () => {

  it('owner can see their own data', () => {
    expect(canViewOtherOwnerData('owner-A', 'owner-A', 'property_owner')).toBe(true);
  });

  it('owner cannot see another owner\'s data', () => {
    expect(canViewOtherOwnerData('owner-A', 'owner-B', 'property_owner')).toBe(false);
  });

  it('admin can see any owner\'s data', () => {
    expect(canViewOtherOwnerData('admin-1', 'owner-B', 'admin')).toBe(true);
  });

  it('super_admin can see any owner\'s data', () => {
    expect(canViewOtherOwnerData('super-1', 'owner-B', 'super_admin')).toBe(true);
  });

});

describe('Cleaner job isolation', () => {

  it('cleaner can see their own job', () => {
    expect(canViewOtherCleanerJob('cleaner-A', 'cleaner-A', 'cleaner')).toBe(true);
  });

  it('cleaner cannot see another cleaner\'s job', () => {
    expect(canViewOtherCleanerJob('cleaner-A', 'cleaner-B', 'cleaner')).toBe(false);
  });

  it('admin can see any cleaner\'s job', () => {
    expect(canViewOtherCleanerJob('admin-1', 'cleaner-B', 'admin')).toBe(true);
  });

});

// ─── Dispute resolution ───────────────────────────────────────────────────────

describe('Dispute resolution', () => {

  it('admin can resolve disputes', () => {
    expect(canResolveDispute('admin')).toBe(true);
  });

  it('super_admin can resolve disputes', () => {
    expect(canResolveDispute('super_admin')).toBe(true);
  });

  it('property_owner cannot resolve disputes', () => {
    expect(canResolveDispute('property_owner')).toBe(false);
  });

  it('cleaner cannot resolve disputes', () => {
    expect(canResolveDispute('cleaner')).toBe(false);
  });

});
