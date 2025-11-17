import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ErrorHandler, ErrorSeverity } from '../errorHandler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    // Nettoyer les mocks avant chaque test
    vi.clearAllMocks();
  });

  describe('capture', () => {
    it('should capture an error with default severity', () => {
      const error = new Error('Test error');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      ErrorHandler.capture(error);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should capture a string error', () => {
      const errorMessage = 'Test error message';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      ErrorHandler.capture(errorMessage, ErrorSeverity.HIGH);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should include context in error capture', () => {
      const error = new Error('Test error');
      const context = {
        userId: '123',
        component: 'TestComponent',
        action: 'testAction',
      };
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      ErrorHandler.capture(error, ErrorSeverity.MEDIUM, context);

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('withErrorHandling', () => {
    it('should execute async function successfully', async () => {
      const mockFn = vi.fn().mockResolvedValue('success');

      const result = await ErrorHandler.withErrorHandling(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle async function errors', async () => {
      const mockError = new Error('Async error');
      const mockFn = vi.fn().mockRejectedValue(mockError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await ErrorHandler.withErrorHandling(mockFn);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('withErrorHandlingSync', () => {
    it('should execute sync function successfully', () => {
      const mockFn = vi.fn().mockReturnValue('success');

      const result = ErrorHandler.withErrorHandlingSync(mockFn);

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle sync function errors', () => {
      const mockError = new Error('Sync error');
      const mockFn = vi.fn().mockImplementation(() => {
        throw mockError;
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = ErrorHandler.withErrorHandlingSync(mockFn);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('User context', () => {
    it('should set user context', () => {
      expect(() => {
        ErrorHandler.setUserContext('user123', 'test@example.com', 'team456');
      }).not.toThrow();
    });

    it('should clear user context', () => {
      expect(() => {
        ErrorHandler.clearUserContext();
      }).not.toThrow();
    });
  });

  describe('Breadcrumbs', () => {
    it('should add breadcrumb', () => {
      expect(() => {
        ErrorHandler.addBreadcrumb('Test breadcrumb', 'test-category', {
          extra: 'data',
        });
      }).not.toThrow();
    });
  });
});
