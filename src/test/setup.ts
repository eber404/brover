import { configure } from '@testing-library/dom'
import '@testing-library/jest-dom/vitest'

// Radix dialogs mount through requestAnimationFrame plus animation frames.
// Under parallel workers the default 1s budget for findBy*/waitFor starves, so
// give jsdom assertions a little headroom. The per-test `testTimeout` stays at
// the Vitest default so real hangs are still caught.
configure({ asyncUtilTimeout: 3000 })
