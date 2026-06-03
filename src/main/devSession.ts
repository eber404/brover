type ClearStorageKind =
  | 'cookies'
  | 'filesystem'
  | 'indexdb'
  | 'shadercache'
  | 'websql'
  | 'serviceworkers'
  | 'cachestorage'

export function getDevStorageClearOptions() {
  return {
    storages: [
      'cookies',
      'filesystem',
      'indexdb',
      'shadercache',
      'websql',
      'serviceworkers',
      'cachestorage',
    ] as ClearStorageKind[],
  }
}
