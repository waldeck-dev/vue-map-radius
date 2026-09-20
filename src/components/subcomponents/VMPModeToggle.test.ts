// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ModeToggle from './VMPModeToggle.vue'

function mountToggle(mode: 'radius' | 'polygon' = 'radius', disabled = false) {
  return mount(ModeToggle, {
    props: { mode, radiusLabel: 'Radius', polygonLabel: 'Polygon', groupLabel: 'Selection mode', disabled },
    attachTo: document.body,
  })
}

describe('VMPModeToggle accessibility', () => {
  it('exposes a labelled radiogroup with one tab stop', () => {
    const wrapper = mountToggle()
    expect(wrapper.get('[role="radiogroup"]').attributes('aria-label')).toBe('Selection mode')
    const tabIndexes = wrapper.findAll('[role="radio"]').map((b) => b.attributes('tabindex'))
    expect(tabIndexes).toEqual(['0', '-1'])
  })

  it('moves and checks with the arrow keys, and wraps around', async () => {
    const wrapper = mountToggle()
    await wrapper.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowRight' })
    expect(wrapper.emitted('update:mode')?.[0]).toEqual(['polygon'])

    // Still on 'radius' until the parent writes the prop back: ArrowLeft wraps
    // to the last radio rather than silently doing nothing.
    await wrapper.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowLeft' })
    expect(wrapper.emitted('update:mode')?.[1]).toEqual(['polygon'])
  })

  it('stays put while disabled', async () => {
    const wrapper = mountToggle('radius', true)
    await wrapper.get('[role="radiogroup"]').trigger('keydown', { key: 'ArrowRight' })
    await wrapper.findAll('[role="radio"]')[1].trigger('click')
    expect(wrapper.emitted('update:mode')).toBeUndefined()
  })
})
