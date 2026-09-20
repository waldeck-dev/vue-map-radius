// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import SearchBar from './VMPSearchBar.vue'
import type { GeocodingResult } from '../../types'

const results: GeocodingResult[] = [
  { id: 'a', text: 'Paris', placeName: 'Paris, France', center: [2.35, 48.85], type: 'place' },
  { id: 'b', text: 'Lyon', placeName: 'Lyon, France', center: [4.83, 45.76], type: 'place' },
]

function mountBar(props: Partial<InstanceType<typeof SearchBar>['$props']> = {}) {
  return mount(SearchBar, {
    props: {
      modelValue: 'par',
      placeholder: 'Search…',
      results,
      loading: false,
      noResultsText: 'No results',
      loadingText: 'Searching…',
      label: 'Search for a location',
      ...props,
    },
    attachTo: document.body,
  })
}

describe('VMPSearchBar accessibility', () => {
  it('puts the combobox role and its state on the input, where focus lives', async () => {
    const wrapper = mountBar()
    const input = wrapper.get('input')
    expect(input.attributes('role')).toBe('combobox')
    expect(input.attributes('aria-label')).toBe('Search for a location')
    expect(input.attributes('aria-autocomplete')).toBe('list')
    expect(input.attributes('aria-expanded')).toBe('false')

    await input.trigger('focus')
    expect(input.attributes('aria-expanded')).toBe('true')
    expect(input.attributes('aria-controls')).toBe(wrapper.get('[role="listbox"]').attributes('id'))
  })

  it('points aria-activedescendant at the option the arrow keys landed on', async () => {
    const wrapper = mountBar()
    const input = wrapper.get('input')
    await input.trigger('focus')
    expect(input.attributes('aria-activedescendant')).toBeUndefined()

    await input.trigger('keydown', { key: 'ArrowDown' })
    const options = wrapper.findAll('[role="option"]')
    expect(input.attributes('aria-activedescendant')).toBe(options[0].attributes('id'))
    expect(options[0].attributes('aria-selected')).toBe('true')

    await input.trigger('keydown', { key: 'ArrowDown' })
    expect(input.attributes('aria-activedescendant')).toBe(options[1].attributes('id'))

    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')?.[0][0]).toMatchObject({ id: 'b' })
  })

  it('gives two search bars on one page distinct option ids', async () => {
    const props = {
      modelValue: 'par', placeholder: 'Search…', results, loading: false,
      noResultsText: 'No results', loadingText: 'Searching…', label: 'Search',
    }
    const wrapper = mount(defineComponent({
      render: () => h('div', [h(SearchBar, props), h(SearchBar, props)]),
    }), { attachTo: document.body })

    for (const input of wrapper.findAll('input')) await input.trigger('focus')
    const ids = wrapper.findAll('[role="option"]').map((o) => o.attributes('id'))
    expect(ids).toHaveLength(4)
    expect(new Set(ids).size).toBe(4)
  })
})
