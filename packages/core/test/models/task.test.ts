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

    it('should create correct ID for Trello', () => {
      expect(createTaskId('trello', 'card123')).toBe('TRELLO-card123');
    });

    it('should create correct ID for Linear', () => {
      expect(createTaskId('linear', 'ENG-42')).toBe('LINEAR-ENG-42');
    });

    it('should create correct ID for ClickUp', () => {
      expect(createTaskId('clickup', 'abc123')).toBe('CLICKUP-abc123');
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

    it('should parse Trello task ID', () => {
      const result = parseTaskId('TRELLO-card123');
      expect(result).toEqual({ source: 'trello', externalId: 'card123' });
    });

    it('should parse Linear task ID', () => {
      const result = parseTaskId('LINEAR-ENG-42');
      expect(result).toEqual({ source: 'linear', externalId: 'ENG-42' });
    });

    it('should parse ClickUp task ID', () => {
      const result = parseTaskId('CLICKUP-abc123');
      expect(result).toEqual({ source: 'clickup', externalId: 'abc123' });
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
