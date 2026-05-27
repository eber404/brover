const ENV_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/
const BUNDLE_ID_REGEX = /^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/

export function isValidEnvName(value: string): boolean {
  return ENV_NAME_REGEX.test(value)
}

export function isValidBundleID(value: string): boolean {
  return BUNDLE_ID_REGEX.test(value)
}
