/**
 * "Add to Home Screen" support.
 *
 * - Chrome/Edge/Android fire `beforeinstallprompt`; we capture it and can
 *   trigger the native install dialog on demand.
 * - iOS Safari has no programmatic prompt, so we detect iOS and surface
 *   step-by-step instructions instead.
 * - When already installed (standalone display mode), we stay quiet.
 */
import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null

export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  const ua = navigator.userAgent
  const iOSDevice = /iphone|ipad|ipod/i.test(ua)
  // iPadOS 13+ reports a Mac UA but has touch.
  const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return iOSDevice || iPadOS
}

export function useInstallPrompt() {
  const [canPromptNative, setCanPromptNative] = useState(Boolean(deferred))
  const [standalone, setStandalone] = useState(isStandalone())

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      deferred = e as BeforeInstallPromptEvent
      setCanPromptNative(true)
    }
    const onInstalled = () => {
      deferred = null
      setCanPromptNative(false)
      setStandalone(true)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferred) return false
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'accepted') {
      deferred = null
      setCanPromptNative(false)
      return true
    }
    return false
  }, [])

  return {
    standalone,
    canPromptNative,
    promptInstall,
    ios: isIOS(),
  }
}
