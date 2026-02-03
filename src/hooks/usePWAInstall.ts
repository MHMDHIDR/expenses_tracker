import { useState, useEffect, useCallback } from "react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export interface UsePWAInstallReturn {
  /** Whether the app can be installed (install prompt is available) */
  canInstall: boolean;
  /** Whether the app is already installed as PWA */
  isInstalled: boolean;
  /** Whether we're on iOS (requires different install instructions) */
  isIOS: boolean;
  /** Whether we're running in standalone mode (already installed) */
  isStandalone: boolean;
  /** Trigger the install prompt */
  install: () => Promise<boolean>;
  /** Dismiss the install prompt (stores preference in localStorage) */
  dismiss: () => void;
  /** Whether user has dismissed the prompt */
  isDismissed: boolean;
}

const DISMISS_KEY = "formday-install-dismissed";

export function usePWAInstall(): UsePWAInstallReturn {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        // @ts-expect-error - iOS Safari specific
        window.navigator.standalone === true;
      setIsStandalone(isStandaloneMode);
      setIsInstalled(isStandaloneMode);
    };

    // Check if iOS
    const checkIOS = () => {
      const ua = window.navigator.userAgent;
      const isIOSDevice =
        /iPad|iPhone|iPod/.test(ua) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
      setIsIOS(isIOSDevice);
    };

    // Check if dismissed
    const checkDismissed = () => {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const dismissedDate = new Date(dismissed);
        const now = new Date();
        // Reset dismissed state after 7 days
        const daysSinceDismissed =
          (now.getTime() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceDismissed > 7) {
          localStorage.removeItem(DISMISS_KEY);
        } else {
          setIsDismissed(true);
        }
      }
    };

    checkStandalone();
    checkIOS();
    checkDismissed();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Store the event for later use
      setDeferredPrompt(e);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    // Check standalone mode changes
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = () => checkStandalone();
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      // Clear the deferred prompt
      setDeferredPrompt(null);

      if (outcome === "accepted") {
        setIsInstalled(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error during PWA install:", error);
      return false;
    }
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    setIsDismissed(true);
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
  }, []);

  return {
    canInstall: !!deferredPrompt && !isInstalled && !isDismissed,
    isInstalled,
    isIOS,
    isStandalone,
    install,
    dismiss,
    isDismissed,
  };
}
