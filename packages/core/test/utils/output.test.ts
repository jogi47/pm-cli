import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createJsonEnvelope,
  renderError,
  renderJsonEnvelope,
  renderTaskAttachments,
  renderThreadEntries,
  renderWarning,
  renderWarnings,
} from '../../src/utils/output.js';
import type { ThreadEntry } from '../../src/models/task.js';

describe('renderThreadEntries', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders attachment metadata and local paths in human output', () => {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value ?? ''));
    });

    const entries: ThreadEntry[] = [
      {
        id: 'attachment-1',
        body: 'Added attachment: mockup.png',
        kind: 'attachment',
        attachments: [{
          id: 'att-1',
          name: 'mockup.png',
          kind: 'image',
          source: 'asana',
          localPath: '/tmp/pm-cli/task-123/mockup-att-1.png',
        }],
        source: 'asana',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];

    renderThreadEntries(entries, 'table');

    expect(logs.some((line) => line.includes('Attachments (1):'))).toBe(true);
    expect(logs.some((line) => line.includes('mockup.png'))).toBe(true);
    expect(logs.some((line) => line.includes('/tmp/pm-cli/task-123/mockup-att-1.png'))).toBe(true);
  });
});

describe('renderTaskAttachments', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders attachment-only output', () => {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value ?? ''));
    });

    renderTaskAttachments([{
      id: 'att-1',
      name: 'notes.pdf',
      kind: 'document',
      source: 'asana',
      viewUrl: 'https://view.example/notes.pdf',
    }], 'table');

    expect(logs.some((line) => line.includes('notes.pdf'))).toBe(true);
    expect(logs.some((line) => line.includes('[document]'))).toBe(true);
    expect(logs.some((line) => line.includes('https://view.example/notes.pdf'))).toBe(true);
    expect(logs.some((line) => line.includes('1 attachment'))).toBe(true);
  });

  it('falls back to permalink URLs when no download or view URL is present', () => {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value ?? ''));
    });

    renderTaskAttachments([{
      id: 'att-2',
      name: 'brief.pdf',
      kind: 'document',
      source: 'asana',
      permalinkUrl: 'https://app.asana.com/0/123/456/f',
    }], 'table');

    expect(logs.some((line) => line.includes('brief.pdf'))).toBe(true);
    expect(logs.some((line) => line.includes('https://app.asana.com/0/123/456/f'))).toBe(true);
  });
});

describe('renderError/renderWarning', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes human-readable errors to stderr', () => {
    const errors: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((value?: unknown) => {
      errors.push(String(value ?? ''));
    });

    renderError('boom');

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('boom');
  });

  it('writes warnings to stderr', () => {
    const errors: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((value?: unknown) => {
      errors.push(String(value ?? ''));
    });

    renderWarning('careful');

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('careful');
  });

  it('writes warning collections in order', () => {
    const errors: string[] = [];
    vi.spyOn(console, 'error').mockImplementation((value?: unknown) => {
      errors.push(String(value ?? ''));
    });

    renderWarnings(['first', 'second']);

    expect(errors).toHaveLength(2);
    expect(errors[0]).toContain('first');
    expect(errors[1]).toContain('second');
  });
});

describe('json envelope helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates versioned envelopes with default array metadata', () => {
    expect(createJsonEnvelope('tasks search', [{ id: 'ASANA-1' }], {
      warnings: ['partial result'],
      errors: ['asana timeout'],
    })).toEqual({
      schemaVersion: '1',
      command: 'tasks search',
      data: [{ id: 'ASANA-1' }],
      warnings: ['partial result'],
      errors: ['asana timeout'],
      meta: { count: 1 },
    });
  });

  it('renders versioned envelopes to stdout', () => {
    const logs: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((value?: unknown) => {
      logs.push(String(value ?? ''));
    });

    renderJsonEnvelope('tasks show', { id: 'ASANA-1' }, {
      meta: { includesTask: true },
    });

    expect(logs).toHaveLength(1);
    expect(JSON.parse(logs[0])).toEqual({
      schemaVersion: '1',
      command: 'tasks show',
      data: { id: 'ASANA-1' },
      warnings: [],
      errors: [],
      meta: { includesTask: true },
    });
  });
});
