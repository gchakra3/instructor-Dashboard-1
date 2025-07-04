import FingerprintJS from '@fingerprintjs/fingerprintjs'

let fpPromise: Promise<any> | null = null

export const getFingerprint = async (): Promise<string> => {
  try {
    if (!fpPromise) {
      fpPromise = FingerprintJS.load()
    }
    
    const fp = await fpPromise
    const result = await fp.get()
    return result.visitorId
  } catch (error) {
    console.error('Error generating fingerprint:', error)
    // Fallback to a simple identifier based on browser characteristics
    const fallback = `${navigator.userAgent}_${screen.width}x${screen.height}_${navigator.language}_${new Date().getTimezoneOffset()}`
    return btoa(fallback).replace(/[^a-zA-Z0-9]/g, '').substring(0, 32)
  }
}