/**
 * F-43 — prove jsdom + @testing-library/react harness works.
 * Do NOT mount PlayingHost here (RN / Skia / Reanimated).
 *
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';

describe('jsdom harness (F-43)', () => {
  it('mounts a trivial React element', () => {
    render(createElement('div', null, 'harness-ok'));
    expect(screen.getByText('harness-ok')).toBeTruthy();
  });
});
