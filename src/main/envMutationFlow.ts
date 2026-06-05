import type { SecretActionResult } from '../shared/models'

interface MutationDeps {
  cached: boolean
  authorize: () => Promise<void>
}

interface UpdateMutationDeps extends MutationDeps {
  update: () => Promise<void>
}

interface DeleteMutationDeps extends MutationDeps {
  remove: () => Promise<void>
}

function ok(value?: string): SecretActionResult {
  return { ok: true, value }
}

export async function runUpdateMutation(deps: UpdateMutationDeps): Promise<SecretActionResult> {
  if (deps.cached) {
    return ok('needs-confirmation')
  }

  await deps.authorize()
  await deps.update()
  return ok()
}

export async function runDeleteMutation(deps: DeleteMutationDeps): Promise<SecretActionResult> {
  if (deps.cached) {
    return ok('needs-confirmation')
  }

  await deps.authorize()
  await deps.remove()
  return ok()
}
