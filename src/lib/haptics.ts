/**
 * Haptic Feedback Utilities
 * Provides vibration feedback for mobile devices
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning';

/**
 * Trigger haptic feedback if supported by the device
 */
export const triggerHaptic = (pattern: HapticPattern = 'medium'): void => {
  // Check if vibration API is supported
  if (!navigator.vibrate) {
    return;
  }

  try {
    switch (pattern) {
      case 'light':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(20);
        break;
      case 'heavy':
        navigator.vibrate(50);
        break;
      case 'success':
        // Double tap pattern
        navigator.vibrate([30, 50, 30]);
        break;
      case 'error':
        // Triple short burst
        navigator.vibrate([20, 30, 20, 30, 20]);
        break;
      case 'warning':
        // Long single vibration
        navigator.vibrate(40);
        break;
      default:
        navigator.vibrate(20);
    }
  } catch (error) {
    // Silently fail if vibration is not supported or blocked
    console.debug('Haptic feedback not available:', error);
  }
};

/**
 * Check if haptic feedback is supported
 */
export const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator;
};
