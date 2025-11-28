/**
 * Unit tests for SafeLoggerWrapper
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SafeLoggerWrapper } from './SafeLoggerWrapper.js';
import type { ILogger } from '../../interfaces/ILogger.js';

describe('SafeLoggerWrapper', () => {
  let wrapper: SafeLoggerWrapper;
  let mockLogger: ILogger;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      setLevel: vi.fn(),
    };

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('debug method', () => {
    it('debug_whenLoggerSucceeds_thenCallsLogger', () => {
      // Arrange
      const message = 'Debug message';
      const args = ['arg1', { data: 'arg2' }];
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.debug(message, ...args);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(message, ...args);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('debug_whenLoggerThrows_thenFallsBackToConsole', () => {
      // Arrange
      const message = 'Debug message';
      const error = new Error('Logger connection lost');
      mockLogger.debug = vi.fn().mockImplementation(() => {
        throw error;
      });
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.debug(message);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OOREP-DEBUG]'),
        error
      );
    });
  });

  describe('info method', () => {
    it('info_whenLoggerSucceeds_thenCallsLogger', () => {
      // Arrange
      const message = 'Info message';
      const metadata = { userId: 123 };
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.info(message, metadata);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(message, metadata);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('info_whenLoggerThrows_thenFallsBackToConsole', () => {
      // Arrange
      const message = 'Info message';
      const error = new Error('Logger failed');
      mockLogger.info = vi.fn().mockImplementation(() => {
        throw error;
      });
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.info(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OOREP-INFO]'),
        error
      );
    });
  });

  describe('warn method', () => {
    it('warn_whenLoggerSucceeds_thenCallsLogger', () => {
      // Arrange
      const message = 'Warning message';
      const context = { component: 'cache' };
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.warn(message, context);

      // Assert
      expect(mockLogger.warn).toHaveBeenCalledWith(message, context);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('warn_whenLoggerThrows_thenFallsBackToConsole', () => {
      // Arrange
      const message = 'Warning message';
      const error = new Error('Logger unavailable');
      mockLogger.warn = vi.fn().mockImplementation(() => {
        throw error;
      });
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.warn(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OOREP-WARN]'),
        error
      );
    });
  });

  describe('error method', () => {
    it('error_whenLoggerSucceeds_thenCallsLogger', () => {
      // Arrange
      const message = 'Error message';
      const errorObj = new Error('Something went wrong');
      const additionalData = { requestId: 'abc123' };
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.error(message, errorObj, additionalData);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(message, errorObj, additionalData);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('error_whenLoggerThrows_thenFallsBackToConsole', () => {
      // Arrange
      const message = 'Error message';
      const loggerError = new Error('Logger crash');
      mockLogger.error = vi.fn().mockImplementation(() => {
        throw loggerError;
      });
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.error(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OOREP-ERROR]'),
        loggerError
      );
    });

    it('error_whenCalledWithoutError_thenHandlesCorrectly', () => {
      // Arrange
      const message = 'Error message without error object';
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.error(message);

      // Assert
      expect(mockLogger.error).toHaveBeenCalledWith(message, undefined);
    });
  });

  describe('setLevel method', () => {
    it('setLevel_whenLoggerSucceeds_thenCallsLogger', () => {
      // Arrange
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.setLevel('debug');

      // Assert
      expect(mockLogger.setLevel).toHaveBeenCalledWith('debug');
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('setLevel_whenLoggerThrows_thenFallsBackToConsole', () => {
      // Arrange
      const error = new Error('Cannot set level');
      mockLogger.setLevel = vi.fn().mockImplementation(() => {
        throw error;
      });
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.setLevel('info');

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to set log level'),
        error
      );
    });

    it('setLevel_whenLoggerLacksMethod_thenHandlesGracefully', () => {
      // Arrange
      const loggerWithoutSetLevel: ILogger = {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
      };
      wrapper = new SafeLoggerWrapper(loggerWithoutSetLevel);

      // Act & Assert - should not throw
      expect(() => wrapper.setLevel('warn')).not.toThrow();
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('fallback logging format', () => {
    it('fallbackLog_whenCalled_thenIncludesTimestamp', () => {
      // Arrange
      const message = 'Test message';
      const error = new Error('Test error');
      mockLogger.debug = vi.fn().mockImplementation(() => {
        throw error;
      });
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.debug(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/),
        error
      );
    });

    it('fallbackLog_whenCalled_thenIncludesLevel', () => {
      // Arrange
      const message = 'Test message';
      const error = new Error('Test error');
      mockLogger.warn = vi.fn().mockImplementation(() => {
        throw error;
      });
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.warn(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[OOREP-WARN]'),
        error
      );
    });

    it('fallbackLog_whenCalled_thenIncludesOriginalMessage', () => {
      // Arrange
      const message = 'Important debug info';
      const error = new Error('Logger error');
      mockLogger.debug = vi.fn().mockImplementation(() => {
        throw error;
      });
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.debug(message);

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining(message),
        error
      );
    });
  });

  describe('double failure protection', () => {
    it('fallbackLog_whenConsoleErrorFails_thenSilentlyFails', () => {
      // Arrange
      consoleErrorSpy.mockRestore();
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        throw new Error('Console is broken');
      });

      const message = 'Test message';
      const error = new Error('Logger error');
      mockLogger.debug = vi.fn().mockImplementation(() => {
        throw error;
      });
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act & Assert - should not throw despite console.error failing
      expect(() => wrapper.debug(message)).not.toThrow();
    });
  });

  describe('multiple argument handling', () => {
    it('debug_whenMultipleArgs_thenPassesAllArgs', () => {
      // Arrange
      const message = 'Complex log';
      const args = ['arg1', 42, { nested: { data: true } }, ['array', 'data']];
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.debug(message, ...args);

      // Assert
      expect(mockLogger.debug).toHaveBeenCalledWith(message, ...args);
    });

    it('info_whenNoAdditionalArgs_thenCallsWithMessageOnly', () => {
      // Arrange
      const message = 'Simple info';
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.info(message);

      // Assert
      expect(mockLogger.info).toHaveBeenCalledWith(message);
    });
  });

  describe('edge cases', () => {
    it('wrapper_whenAllMethodsSucceed_thenNeverUsesConsole', () => {
      // Arrange
      wrapper = new SafeLoggerWrapper(mockLogger);

      // Act
      wrapper.debug('debug');
      wrapper.info('info');
      wrapper.warn('warn');
      wrapper.error('error');
      wrapper.setLevel('info');

      // Assert
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.setLevel).toHaveBeenCalled();
    });
  });
});
