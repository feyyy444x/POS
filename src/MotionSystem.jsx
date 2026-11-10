import { useEffect } from 'react'

/**
 * acoPos motion layer.
 * Progressive visual enhancement only; it never changes business state or data.
 */
export default function MotionSystem() {
  useEffect(() => {
    const root = document.documentElement
    const body = document.body
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches
    const finePointer = window.matchMedia?.('(pointer: fine)')?.matches

    body.classList.add('ACO-motion-ready')
    if (reduceMotion) {
      body.classList.add('ACO-motion-reduced')
      return () => body.classList.remove('ACO-motion-ready', 'ACO-motion-reduced')
    }

    let cursor = null
    let cursorFrame = 0
    let pointerX = window.innerWidth / 2
    let pointerY = window.innerHeight / 2
    const magneticTargets = new Set()

    if (finePointer) {
      cursor = document.createElement('span')
      cursor.className = 'ACO-cursor-aura'
      cursor.setAttribute('aria-hidden', 'true')
      body.appendChild(cursor)
    }

    const updatePointer = (event) => {
      pointerX = event.clientX
      pointerY = event.clientY
      root.style.setProperty('--ACO-pointer-x', pointerX + 'px')
      root.style.setProperty('--ACO-pointer-y', pointerY + 'px')
      root.style.setProperty('--ACO-parallax-x', ((pointerX / Math.max(window.innerWidth, 1)) - 0.5).toFixed(3))
      root.style.setProperty('--ACO-parallax-y', ((pointerY / Math.max(window.innerHeight, 1)) - 0.5).toFixed(3))
      root.style.setProperty('--ACO-tilt-x', (((pointerY / Math.max(window.innerHeight, 1)) - 0.5) * -4).toFixed(2) + 'deg')
      root.style.setProperty('--ACO-tilt-y', (((pointerX / Math.max(window.innerWidth, 1)) - 0.5) * 4).toFixed(2) + 'deg')
      if (cursor && !cursorFrame) {
        cursorFrame = window.requestAnimationFrame(() => {
          cursor.style.transform = 'translate3d(' + pointerX + 'px,' + pointerY + 'px,0)'
          cursorFrame = 0
        })
      }
    }

    const onPointerDown = () => body.classList.add('ACO-pointer-pressed')
    const onPointerUp = () => body.classList.remove('ACO-pointer-pressed')

    let revealObserver = null
    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('ACO-is-visible')
          revealObserver.unobserve(entry.target)
        })
      }, { threshold: 0.12, rootMargin: '0px 0px -36px 0px' })
    }

    const matching = (scope, selector) => {
      const items = []
      if (scope?.matches?.(selector)) items.push(scope)
      if (scope?.querySelectorAll) items.push(...scope.querySelectorAll(selector))
      return items
    }

    const enhance = (scope) => {
      if (!scope?.querySelectorAll && !scope?.matches) return

      matching(scope, '.living-home section, .living-reveal, .stat-card, .owner-stat-card, .owner-tenant-card, .report-card, .dashboard-card, .page-section .panel, .page-section .queue-stat-card, .page-section .queue-feature, .owner-page .owner-section, .owner-page .owner-setting-card, .demo-table-panel, .demo-cart-panel')
        .forEach((element) => {
          if (element.dataset.ACOMotionReveal) return
          element.dataset.ACOMotionReveal = 'true'
          element.classList.add('ACO-motion-reveal')
          if (revealObserver) revealObserver.observe(element)
          else element.classList.add('ACO-is-visible')
        })

      matching(scope, '.page-section, .owner-page').forEach((element) => {
        if (element.dataset.ACOPageEnter) return
        element.dataset.ACOPageEnter = 'true'
        element.classList.add('ACO-page-enter')
      })

      matching(scope, '.living-cta, .btn-primary, .nav-link, .owner-nav-link').forEach((element) => {
        if (element.dataset.ACOMagnetic) return
        element.dataset.ACOMagnetic = 'true'
        element.classList.add('ACO-magnetic')
        const move = (event) => {
          const rect = element.getBoundingClientRect()
          const x = (event.clientX - rect.left - rect.width / 2) * 0.10
          const y = (event.clientY - rect.top - rect.height / 2) * 0.10
          element.style.setProperty('--ACO-magnet-x', x.toFixed(1) + 'px')
          element.style.setProperty('--ACO-magnet-y', y.toFixed(1) + 'px')
        }
        const leave = () => {
          element.style.setProperty('--ACO-magnet-x', '0px')
          element.style.setProperty('--ACO-magnet-y', '0px')
        }
        element.addEventListener('pointermove', move, { passive: true })
        element.addEventListener('pointerleave', leave, { passive: true })
        magneticTargets.add({ element, move, leave })
      })

      matching(scope, '.panel, .owner-section, .owner-setting-card, .workspace-card, .living-plan, .living-feature-card')
        .forEach((element) => {
          if (element.dataset.ACOMotionSurface) return
          element.dataset.ACOMotionSurface = 'true'
          element.classList.add('ACO-motion-surface')
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
      magneticTargets.forEach(({ element, move, leave }) => {
        element.removeEventListener('pointermove', move)
        element.removeEventListener('pointerleave', leave)
      })
      magneticTargets.clear()
      if (cursorFrame) window.cancelAnimationFrame(cursorFrame)
      cursor?.remove()
      body.classList.remove('ACO-motion-ready', 'ACO-pointer-pressed')
      root.style.removeProperty('--ACO-pointer-x')
      root.style.removeProperty('--ACO-pointer-y')
      root.style.removeProperty('--ACO-parallax-x')
      root.style.removeProperty('--ACO-parallax-y')
      root.style.removeProperty('--ACO-tilt-x')
      root.style.removeProperty('--ACO-tilt-y')
    }
  }, [])

  return null
}
