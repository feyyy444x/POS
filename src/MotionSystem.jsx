import { useEffect } from 'react'

/**
 * NexaPos motion layer.
 * Adds progressive enhancement only: no business state, routing, or data writes.
 * Respects reduced-motion preferences and never intercepts pointer interactions.
 */
export default function MotionSystem() {
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const finePointer = window.matchMedia?.('(pointer: fine)')?.matches

    body.classList.add('nexa-motion-ready')
    if (reduceMotion) {
      body.classList.add('nexa-motion-reduced')
      return () => {
        body.classList.remove('nexa-motion-ready', 'nexa-motion-reduced')
      }
    }

    let cursor = null
    let cursorFrame = 0
    let pointerX = window.innerWidth / 2
    let pointerY = window.innerHeight / 2

    if (finePointer) {
      cursor = document.createElement('span')
      cursor.className = 'nexa-cursor-aura'
      cursor.setAttribute('aria-hidden', 'true')
      body.appendChild(cursor)
    }

    const updatePointer = (event) => {
      pointerX = event.clientX
      pointerY = event.clientY
      root.style.setProperty('--nexa-pointer-x', pointerX + 'px')
      root.style.setProperty('--nexa-pointer-y', pointerY + 'px')
      root.style.setProperty('--nexa-parallax-x', ((pointerX / Math.max(window.innerWidth, 1)) - 0.5).toFixed(3))
      root.style.setProperty('--nexa-parallax-y', ((pointerY / Math.max(window.innerHeight, 1)) - 0.5).toFixed(3))
      if (cursor && !cursorFrame) {
        cursorFrame = window.requestAnimationFrame(() => {
          cursor.style.transform = 'translate3d(' + pointerX + 'px,' + pointerY + 'px,0)'
          cursorFrame = 0
        })
      }
    }

    const onPointerDown = () => body.classList.add('nexa-pointer-pressed')
    const onPointerUp = () => body.classList.remove('nexa-pointer-pressed')

    let revealObserver = null
    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('nexa-is-visible')
          revealObserver.unobserve(entry.target)
        })
      }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' })
    }

    const enhance = (scope) => {
      if (!scope?.querySelectorAll) return
      const revealTargets = scope.querySelectorAll(
        '.living-home section, .living-reveal, .stat-card, .owner-stat-card, .owner-tenant-card, .report-card, .dashboard-card'
      )
      revealTargets.forEach((element) => {
        if (element.dataset.nexaMotionReveal) return
        element.dataset.nexaMotionReveal = 'true'
        element.classList.add('nexa-motion-reveal')
        if (revealObserver) revealObserver.observe(element)
        else element.classList.add('nexa-is-visible')
      })

      const surfaces = scope.querySelectorAll(
        '.panel, .owner-section, .owner-setting-card, .workspace-card, .living-plan, .living-feature-card'
      )
      surfaces.forEach((element) => {
        if (element.dataset.nexaMotionSurface) return
        element.dataset.nexaMotionSurface = 'true'
        element.classList.add('nexa-motion-surface')
      })
    }

    enhance(document)
    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) enhance(node)
        })
      })
    })
    mutationObserver.observe(document.getElementById('root') || body, { childList: true, subtree: true })

    if (finePointer) {
      window.addEventListener('pointermove', updatePointer, { passive: true })
      window.addEventListener('pointerdown', onPointerDown, { passive: true })
      window.addEventListener('pointerup', onPointerUp, { passive: true })
    }

    return () => {
      mutationObserver.disconnect()
      revealObserver?.disconnect()
      window.removeEventListener('pointermove', updatePointer)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointerup', onPointerUp)
      if (cursorFrame) window.cancelAnimationFrame(cursorFrame)
      cursor?.remove()
      body.classList.remove('nexa-motion-ready', 'nexa-pointer-pressed')
      root.style.removeProperty('--nexa-pointer-x')
      root.style.removeProperty('--nexa-pointer-y')
      root.style.removeProperty('--nexa-parallax-x')
      root.style.removeProperty('--nexa-parallax-y')
    }
  }, [])

  return null
}
