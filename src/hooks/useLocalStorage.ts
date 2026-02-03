import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Custom hook for persisting state to localStorage with SSR support
 * Fixes race conditions and supports multi-tab synchronization
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void, boolean] {
  // Track if we've initialized from localStorage
  const isInitializedRef = useRef(false);

  // Initialize state with a function to avoid SSR issues
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Always return initialValue during SSR
    if (typeof window === "undefined") {
      return initialValue;
    }
    return initialValue;
  });

  // Track loading state for consumers
  const [isLoading, setIsLoading] = useState(true);

  // Read from localStorage on mount (client-side only)
  useEffect(() => {
    if (isInitializedRef.current) return;

    try {
      if (typeof window !== "undefined") {
        const item = window.localStorage.getItem(key);
        if (item !== null) {
          const parsed = JSON.parse(item) as T;
          setStoredValue(parsed);
        }
        isInitializedRef.current = true;
        setIsLoading(false);
      }
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      isInitializedRef.current = true;
      setIsLoading(false);
    }
  }, [key, initialValue]);

  // Persist to localStorage when state changes (only after initialization)
  useEffect(() => {
    if (!isInitializedRef.current) return;

    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Listen for storage events from other tabs/windows
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          const newValue = JSON.parse(event.newValue) as T;
          setStoredValue(newValue);
        } catch (error) {
          console.error(`Error parsing storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  // Memoized setter function
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const newValue = value instanceof Function ? value(prev) : value;
      return newValue;
    });
  }, []);

  return [storedValue, setValue, isLoading];
}

/**
 * Hook to check if localStorage is available
 */
export function useLocalStorageAvailable(): boolean {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    try {
      const testKey = "__localStorage_test__";
      window.localStorage.setItem(testKey, testKey);
      window.localStorage.removeItem(testKey);
      setIsAvailable(true);
    } catch {
      setIsAvailable(false);
    }
  }, []);

  return isAvailable;
}
