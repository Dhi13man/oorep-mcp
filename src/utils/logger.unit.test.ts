/**
 * Unit tests for logging utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ConsoleLogger } from './logger.js';
import { Logger, type LogLevel } from './logger.js';

describe('ConsoleLogger', () => {
  let mockConsoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    mockConsoleError.mockRestore();
  });

  describe('constructor', () => {
    it('Logger when created without level then defaults to info', () => {
      const logger = new ConsoleLogger();

      logger.info('test');
      expect(mockConsoleError).toHaveBeenCalled();

      mockConsoleError.mockClear();
      logger.debug('test');
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it.each<LogLevel>(['debug', 'info', 'warn', 'error'])(
      'Logger when created with %s level then sets level correctly',
      (level: LogLevel) => {
        const logger = new ConsoleLogger(level);

        logger[level]('test');
        expect(mockConsoleError).toHaveBeenCalled();
      }
    );
  });

  describe('setLevel', () => {
    it('setLevel when called then updates log level', () => {
      const logger = new ConsoleLogger('error');

      logger.info('test');
      expect(mockConsoleError).not.toHaveBeenCalled();

      logger.setLevel('info');
      logger.info('test');
      expect(mockConsoleError).toHaveBeenCalled();
    });
  });

  describe('debug', () => {
    it('debug when level is debug then logs message', () => {
      const logger = new ConsoleLogger('debug');
      const message = 'Debug message';

      logger.debug(message);

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('[DEBUG]');
      expect(loggedMessage).toContain(message);
    });

    it('debug when level is info then does not log', () => {
      const logger = new ConsoleLogger('info');

      logger.debug('Debug message');

      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('debug when called with args then includes args in output', () => {
      const logger = new ConsoleLogger('debug');
      const mockArg = { key: 'value' };

      logger.debug('Message', mockArg);

      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain(JSON.stringify(mockArg));
    });
  });

  describe('info', () => {
    it('info when level is info then logs message', () => {
      const logger = new ConsoleLogger('info');
      const message = 'Info message';

      logger.info(message);

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('[INFO]');
      expect(loggedMessage).toContain(message);
    });

    it('info when level is warn then does not log', () => {
      const logger = new ConsoleLogger('warn');

      logger.info('Info message');

      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('info when called with multiple args then includes all args', () => {
      const logger = new ConsoleLogger('info');
      const mockArg1 = 'arg1';
      const mockArg2 = { key: 'value' };

      logger.info('Message', mockArg1, mockArg2);

      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain(JSON.stringify(mockArg1));
      expect(loggedMessage).toContain(JSON.stringify(mockArg2));
    });
  });

  describe('warn', () => {
    it('warn when level is warn then logs message', () => {
      const logger = new ConsoleLogger('warn');
      const message = 'Warning message';

      logger.warn(message);

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('[WARN]');
      expect(loggedMessage).toContain(message);
    });

    it('warn when level is error then does not log', () => {
      const logger = new ConsoleLogger('error');

      logger.warn('Warning message');

      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe('error', () => {
    it('error when level is error then logs message', () => {
      const logger = new ConsoleLogger('error');
      const message = 'Error message';

      logger.error(message);

      expect(mockConsoleError).toHaveBeenCalledTimes(1);
      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('[ERROR]');
      expect(loggedMessage).toContain(message);
    });

    it('error when called with Error object then includes error details', () => {
      const logger = new ConsoleLogger('error');
      const message = 'Error occurred';
      const mockError = new Error('Original error');

      logger.error(message, mockError);

      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain(message);
      expect(loggedMessage).toContain('Original error');
      expect(loggedMessage).toContain('stack');
    });

    it('error when called with non-Error object then includes object', () => {
      const logger = new ConsoleLogger('error');
      const message = 'Error occurred';
      const mockErrorObj = { code: 500, details: 'Server error' };

      logger.error(message, mockErrorObj);

      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain(message);
      expect(loggedMessage).toContain('500');
      expect(loggedMessage).toContain('Server error');
    });

    it('error when called with additional args then includes all args', () => {
      const logger = new ConsoleLogger('error');
      const mockError = new Error('Test error');
      const mockExtra = { requestId: '123' };

      logger.error('Message', mockError, mockExtra);

      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('Test error');
      expect(loggedMessage).toContain('requestId');
      expect(loggedMessage).toContain('123');
    });

    it('error when always logs regardless of level', () => {
      const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

      levels.forEach((level) => {
        mockConsoleError.mockClear();
        const logger = new ConsoleLogger(level);

        logger.error('Error message');

        expect(mockConsoleError).toHaveBeenCalled();
      });
    });
  });

  describe('message formatting', () => {
    it('formatMessage when called then includes timestamp', () => {
      const logger = new ConsoleLogger('info');

      logger.info('Test message');

      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('formatMessage when called then includes log level in uppercase', () => {
      const logger = new ConsoleLogger('info');

      logger.info('Test message');

      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('[INFO]');
    });

    it('formatMessage when called with no args then only includes message', () => {
      const logger = new ConsoleLogger('info');
      const message = 'Simple message';

      logger.info(message);

      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain(message);
      expect(loggedMessage).toMatch(/\[INFO\] Simple message$/);
    });

    it('formatMessage when called with args then separates args with space', () => {
      const logger = new ConsoleLogger('info');

      logger.info('Message', 'arg1', 'arg2');

      const loggedMessage = mockConsoleError.mock.calls[0][0];
      expect(loggedMessage).toContain('"arg1"');
      expect(loggedMessage).toContain('"arg2"');
    });
  });

  describe('log level hierarchy', () => {
    it.each([
      ['debug', ['debug', 'info', 'warn', 'error']],
      ['info', ['info', 'warn', 'error']],
      ['warn', ['warn', 'error']],
      ['error', ['error']],
    ] as Array<[LogLevel, LogLevel[]]>)(
      'Logger when level is %s then logs %s',
      (setLevel: LogLevel, expectedLevels: LogLevel[]) => {
        const logger = new ConsoleLogger(setLevel);
        const allLevels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

        allLevels.forEach((level) => {
          mockConsoleError.mockClear();
          logger[level]('test');

          if (expectedLevels.includes(level)) {
            expect(mockConsoleError).toHaveBeenCalled();
          } else {
            expect(mockConsoleError).not.toHaveBeenCalled();
          }
        });
      }
    );
  });
});
