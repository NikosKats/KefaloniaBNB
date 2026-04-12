// tests/fixtures/users.ts
// Deterministic test identities used across unit, integration and E2E tests.

export const FIXTURES = {

  superAdmin: {
    id:              '00000000-0000-0000-0000-aaaaaaaaaaaa',
    email:           'alexandros@kefaloniabnb.com',
    password:        'TestPass123!',
    full_name:       'Alexandros Papadopoulos',
    role:            'super_admin' as const,
    admin_test_mode: false,
  },

  owners: {
    nikos: {
      id:                     '00000000-0000-0000-0000-bbbbbbbbbb10',
      email:                  'nikos@kefaloniabnb.com',
      password:               'TestPass123!',
      full_name:              'Nikos Petridis',
      role:                   'property_owner' as const,
      stripe_account_id:      'acct_test_nikos',
      stripe_onboarding_done: true,
    },
    sofia: {
      id:                     '00000000-0000-0000-0000-bbbbbbbbbb11',
      email:                  'sofia@kefaloniabnb.com',
      password:               'TestPass123!',
      full_name:              'Sofia Andreou',
      role:                   'property_owner' as const,
      stripe_account_id:      null,
      stripe_onboarding_done: false,
    },
  },

  cleaners: {
    elena: {
      id:                     '00000000-0000-0000-0000-cccccccccc20',
      email:                  'elena@kefaloniabnb.com',
      password:               'TestPass123!',
      full_name:              'Elena Stavrou',
      role:                   'cleaner' as const,
      stripe_account_id:      'acct_test_elena',
      stripe_onboarding_done: true,
    },
    stavros: {
      id:                     '00000000-0000-0000-0000-cccccccccc21',
      email:                  'stavros@kefaloniabnb.com',
      password:               'TestPass123!',
      full_name:              'Stavros Nikolaou',
      role:                   'cleaner' as const,
      stripe_account_id:      null,
      stripe_onboarding_done: false,
    },
  },

  // Guests have no app account — they appear only as booking records
  guests: {
    maria: {
      name:    'Maria Konstantinou',
      email:   'maria.k@example.com',
      phone:   '+306912345678',
      country: 'Greece',
    },
    kostas: {
      name:    'Kostas Alexiou',
      email:   'kostas.a@example.com',
      phone:   '+30697654321',
      country: 'Greece',
    },
    thomas: {
      name:    'Thomas Weber',
      email:   'thomas.w@example.de',
      phone:   '+491765551234',
      country: 'Germany',
    },
  },

} as const;

// ─── Credential helpers ────────────────────────────────────────────────────────

export function ownerCredentials(key: keyof typeof FIXTURES.owners) {
  return {
    email:    FIXTURES.owners[key].email,
    password: FIXTURES.owners[key].password,
  };
}

export function cleanerCredentials(key: keyof typeof FIXTURES.cleaners) {
  return {
    email:    FIXTURES.cleaners[key].email,
    password: FIXTURES.cleaners[key].password,
  };
}
