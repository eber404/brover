import type { BroverAPI } from '../shared/ipc'

declare global {
  interface Window {
    brover: BroverAPI
  }
}

export {}
