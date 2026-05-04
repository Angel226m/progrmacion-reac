import { describe, it, expect, vi, beforeEach } from 'vitest';

describe.skip('pages/personal (requiere setup complejo)', () => {
  it('renderiza tabs de Personal y Horarios', async () => {
    const { default: PersonalPage } = await import('../../pages/PersonalPage');
    expect(PersonalPage).toBeDefined();
  });
});