// test/models/task.test.ts

import { describe, it, expect } from 'vitest';
import { createTaskId, parseTaskId } from '../../src/models/task.js';

describe('Task Model', () => {
  describe('createTaskId', () => {
    it('should create correct ID for Asana', () => {
      expect(createTaskId('asana', '12345')).toBe('ASANA-12345');
    });

    it('should create correct ID for Notion', () => {
      expect(createTaskId('notion', 'abc-def')).toBe('NOTION-abc-def');
    });
  });

  describe('parseTaskId', () => {
    it('should parse Asana task ID', () => {
      const result = parseTaskId('ASANA-12345');
      expect(result).toEqual({ source: 'asana', externalId: '12345' });
    });

    it('should parse Notion task ID', () => {
      const result = parseTaskId('NOTION-abc-def-123');
      expect(result).toEqual({ source: 'notion', externalId: 'abc-def-123' });
    });

    it('should return null for invalid format', () => {
      expect(parseTaskId('invalid')).toBeNull();
      expect(parseTaskId('JIRA-123')).toBeNull();
    });

    it('should be case insensitive', () => {
      const result = parseTaskId('asana-12345');
      expect(result).toEqual({ source: 'asana', externalId: '12345' });
    });
  });
});
