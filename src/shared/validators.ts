const ENV_NAME_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/

export function isValidEnvName(value: string): boolean {
  return ENV_NAME_REGEX.test(value)
}
