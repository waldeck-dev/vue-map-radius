// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ZoneList from './VMPZoneList.vue'

const zones = [
  { id: 'a', name: 'Paris', color: '#3b82f6' },
  { id: 'b', name: 'Lyon', color: '#ef4444' },
]

describe('VMPZoneList', () => {
  it('makes a selectable chip a real button, so it is reachable by keyboard', async () => {
    const wrapper = mount(ZoneList, {
      props: { zones, removeLabel: 'Remove', selectable: true, selectedId: 'b' },
    })
    const chips = wrapper.findAll('.vmr-zone-chip-select')
    expect(chips.map((c) => c.element.tagName)).toEqual(['BUTTON', 'BUTTON'])
    expect(chips.map((c) => c.attributes('aria-pressed'))).toEqual(['false', 'true'])

    await chips[0].trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual(['a'])
  })

  it('leaves the chip inert in polygon mode, where there is nothing to select', async () => {
    const wrapper = mount(ZoneList, { props: { zones, removeLabel: 'Remove' } })
    const chip = wrapper.get('.vmr-zone-chip-select')
    expect(chip.element.tagName).toBe('SPAN')
    expect(chip.attributes('aria-pressed')).toBeUndefined()

    await chip.trigger('click')
    expect(wrapper.emitted('select')).toBeUndefined()
  })

  it('removes without also selecting, and names the zone in the button label', async () => {
    const wrapper = mount(ZoneList, {
      props: { zones, removeLabel: 'Remove', selectable: true },
    })
    const remove = wrapper.findAll('.vmr-zone-chip-remove')[1]
    expect(remove.attributes('aria-label')).toBe('Remove: Lyon')

    await remove.trigger('click')
    expect(wrapper.emitted('remove')?.[0]).toEqual(['b'])
    expect(wrapper.emitted('select')).toBeUndefined()
  })
})
