import { useEffect } from 'react'

export default function HideSplash({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const el = document.getElementById('app-loading')
    if (!el) return
    el.classList.add('fade-out')
    el.addEventListener('transitionend', () => el.remove(), { once: true })
  }, [])

  return <>{children}</>
}
