import { test, expect } from '@playwright/test'
import { _electron as electron } from 'playwright'
import { join } from 'node:path'

const electronAppPath = join(__dirname, '../..')

test.describe('Targets CRUD Flow', () => {
  let electronApp: Awaited<ReturnType<typeof electron.launch>>

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: [electronAppPath],
      env: {
        ...process.env,
        NODE_ENV: 'test',
        BROVER_E2E: '1',
        BROVER_SKIP_AUTH: '1',
      },
    })
  })

  test.afterEach(async () => {
    await electronApp.close()
  })

  test('create, rename, recolor and delete target', async () => {
    const window = await electronApp.firstWindow()
    await window.waitForFunction(() => Boolean(window.brover))

    const targetName = `pw-target-${Date.now()}`
    const renamed = `${targetName}-renamed`
    const updatedColor = '#8b5cf6'

    const result = await window.evaluate(
      async ({ targetName, renamed, updatedColor }) => {
        const spaces = await window.brover.listSpaces()
        const globalSpace =
          spaces.find((space) => space.id === 'space-global') ?? spaces[0]
        if (!globalSpace) throw new Error('No space available')

        const currentTargets = await window.brover.listTargets(globalSpace.id)
        const stale = currentTargets.filter(
          (item) => item.name === targetName || item.name === renamed
        )
        for (const item of stale) {
          await window.brover.deleteTarget({ targetId: item.id })
        }

        const createdTargets = await window.brover.createTarget({
          spaceId: globalSpace.id,
          name: targetName,
        })
        const created = createdTargets.find((item) => item.name === targetName)
        if (!created) throw new Error('Target not created')

        const renamedTargets = await window.brover.renameTarget({
          targetId: created.id,
          name: renamed,
        })
        const renamedTarget = renamedTargets.find((item) => item.id === created.id)
        if (!renamedTarget) throw new Error('Target not found after rename')

        const recoloredTargets = await window.brover.setTargetColor({
          targetId: created.id,
          color: updatedColor,
        })
        const recoloredTarget = recoloredTargets.find((item) => item.id === created.id)
        if (!recoloredTarget) throw new Error('Target not found after recolor')

        await window.brover.deleteTarget({ targetId: created.id })
        const finalTargets = await window.brover.listTargets(globalSpace.id)

        return {
          createdName: created.name,
          renamedName: renamedTarget.name,
          recoloredColor: recoloredTarget.color,
          existsAfterDelete: finalTargets.some((item) => item.id === created.id),
        }
      },
      { targetName, renamed, updatedColor }
    )

    expect(result.createdName).toBe(targetName)
    expect(result.renamedName).toBe(renamed)
    expect(result.recoloredColor).toBe(updatedColor)
    expect(result.existsAfterDelete).toBe(false)
  })
})
