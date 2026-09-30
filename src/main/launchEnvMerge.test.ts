import { describe, expect, it } from 'vitest'
import type { EnvMetadata } from '../shared/models'
import {
  collectLaunchEntries,
  mergeLaunchEntries,
  pickGlobalEnvironmentId,
} from './launchEnvMerge'

function env(name: string, profile: string): EnvMetadata {
  return {
    id: `${profile}:${name}`,
    name,
    profile,
    enabled: true,
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function envs(...items: EnvMetadata[]): EnvMetadata[] {
  return items
}

function lookup(values: Record<string, string>) {
  return async (environmentId: string, name: string) => values[`${environmentId}:${name}`] ?? null
}

describe('pickGlobalEnvironmentId', () => {
  it('returns the environment flagged as global', () => {
    expect(
      pickGlobalEnvironmentId([
        { id: 'env-1', isGlobal: false },
        { id: 'env-2', isGlobal: true },
      ])
    ).toBe('env-2')
  })

  it('returns null when no environment is global', () => {
    expect(pickGlobalEnvironmentId([{ id: 'env-1' }])).toBeNull()
    expect(pickGlobalEnvironmentId([])).toBeNull()
  })
})

describe('collectLaunchEntries', () => {
  it('keeps global-only names and lets launched names override', async () => {
    const values = {
      'global:GLOBAL_ONLY': 'g1',
      'global:SHARED': 'from-global',
      'env-1:LOCAL_ONLY': 'l1',
      'env-1:SHARED': 'from-launched',
    }

    const globalEntries = await collectLaunchEntries(
      envs(env('GLOBAL_ONLY', 'global'), env('SHARED', 'global')),
      'global',
      lookup(values)
    )
    const launchedEntries = await collectLaunchEntries(
      envs(env('LOCAL_ONLY', 'env-1'), env('SHARED', 'env-1')),
      'env-1',
      lookup(values)
    )

    expect(mergeLaunchEntries(globalEntries, launchedEntries)).toEqual([
      { name: 'GLOBAL_ONLY', value: 'g1' },
      { name: 'SHARED', value: 'from-launched' },
      { name: 'LOCAL_ONLY', value: 'l1' },
    ])
  })

  it('yields global entries once when launching from the global environment', async () => {
    const source = envs(env('A', 'global'), env('B', 'global'))
    const readValue = lookup({ 'global:A': 'a', 'global:B': 'b' })

    const entries = await collectLaunchEntries(source, 'global', readValue)

    expect(mergeLaunchEntries(entries, entries)).toEqual([
      { name: 'A', value: 'a' },
      { name: 'B', value: 'b' },
    ])
  })

  it('returns launched entries only when global has none', async () => {
    const launchedEntries = await collectLaunchEntries(
      envs(env('A', 'env-1')),
      'env-1',
      lookup({ 'env-1:A': 'a' })
    )

    expect(mergeLaunchEntries([], launchedEntries)).toEqual([{ name: 'A', value: 'a' }])
  })

  it('skips envs without a stored value and never reads across environments', async () => {
    const source = envs(env('EMPTY', 'env-1'), env('FILLED', 'env-1'), env('EMPTY', 'global'))
    const requested: string[] = []
    const readValue = async (environmentId: string, name: string) => {
      requested.push(`${environmentId}:${name}`)
      if (environmentId !== 'env-1') return null
      if (name === 'FILLED') return 'v'
      return null
    }

    const entries = await collectLaunchEntries(source, 'env-1', readValue)

    expect(entries).toEqual([{ name: 'FILLED', value: 'v' }])
    expect(requested).toEqual(['env-1:EMPTY', 'env-1:FILLED'])
  })
})

describe('mergeLaunchEntries', () => {
  it('emits each name once with the launched value winning', () => {
    const merged = mergeLaunchEntries(
      [
        { name: 'SHARED', value: 'g' },
        { name: 'ONLY_GLOBAL', value: 'g2' },
      ],
      [
        { name: 'SHARED', value: 'l' },
        { name: 'ONLY_LAUNCHED', value: 'l2' },
      ]
    )

    expect(merged.filter(entry => entry.name === 'SHARED')).toHaveLength(1)
    expect(merged).toEqual([
      { name: 'SHARED', value: 'l' },
      { name: 'ONLY_GLOBAL', value: 'g2' },
      { name: 'ONLY_LAUNCHED', value: 'l2' },
    ])
  })

  it('does not mutate the inputs', () => {
    const global = [{ name: 'A', value: 'g' }]
    const launched = [{ name: 'A', value: 'l' }]

    mergeLaunchEntries(global, launched)

    expect(global).toEqual([{ name: 'A', value: 'g' }])
    expect(launched).toEqual([{ name: 'A', value: 'l' }])
  })
})