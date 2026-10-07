import * as LocalAuthentication from 'expo-local-authentication';

/** Asks for Face ID / Touch ID / fingerprint, falling back to the device passcode. */
export async function authenticate(promptMessage = 'Déverrouiller ScanFacile') {
  const level = await LocalAuthentication.getEnrolledLevelAsync().catch(() => LocalAuthentication.SecurityLevel.NONE);
  // No biometrics and no passcode configured on the phone: nothing to check against.
  if (level === LocalAuthentication.SecurityLevel.NONE) return true;
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Annuler',
    fallbackLabel: 'Utiliser le code',
    disableDeviceFallback: false,
  });
  return res.success;
}

/** Documents unlocked during this app session. */
export const unlockedThisSession = new Set<string>();
