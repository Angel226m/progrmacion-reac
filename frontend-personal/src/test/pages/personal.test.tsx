import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('pages/personal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('PersonalPage se importa correctamente', async () => {
    const { default: PersonalPage } = await import('../../pages/PersonalPage');
    expect(PersonalPage).toBeDefined();
  });
});
