// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import MapRadius from './MapRadius.vue'
import type { MapRadiusState } from '../types'

/**
 * Stands in for VMPMapContainer: exposes the same surface MapRadius drives, so
 * the component can be mounted without MapLibre, a WebGL context or a network.
 */
function createMapStub() {
  const api = {
    mapReady: true,
    updateCircle: vi.fn(),
    clearCircle: vi.fn(),
    updatePolygon: vi.fn(),
    clearPolygon: vi.fn(),
    setVisibility: vi.fn(),
    fitBounds: vi.fn(),
    flyTo: vi.fn(),
    setCenterMarker: vi.fn(),
    removeCenterMarker: vi.fn(),
    setRadiusHandle: vi.fn(),
    updateRadiusHandlePosition: vi.fn(),
    removeRadiusHandle: vi.fn(),
    setRadiusLine: vi.fn(),
    removeRadiusLine: vi.fn(),
    setRadiusTooltip: vi.fn(),
    hideRadiusTooltip: vi.fn(),
  }
  const component = defineComponent({
    name: 'MapContainer',
    setup(_props, { expose }) {
      expose(api)
      return () => h('div', { class: 'map-stub' })
    },
  })
  return { api, component }
}

function radiusState(circles: MapRadiusState['circles']): MapRadiusState {
  return { mode: 'radius', center: null, radiusKm: 0, polygon: null, name: null, zones: [], circles }
}

function polygonState(center: [number, number] | null): MapRadiusState {
  return { mode: 'polygon', center, radiusKm: 0, polygon: null, name: null, zones: [], circles: [] }
}

async function mountMapRadius(modelValue?: MapRadiusState) {
  const stub = createMapStub()
  const wrapper = mount(MapRadius, {
    props: { apiKey: 'test-key', modelValue },
    global: { stubs: { MapContainer: stub.component } },
  })
  await nextTick()
  return { wrapper, api: stub.api }
}

function lastEmitted(wrapper: Awaited<ReturnType<typeof mountMapRadius>>['wrapper']): MapRadiusState {
  const events = wrapper.emitted('update:modelValue') as MapRadiusState[][]
  return events[events.length - 1][0]
}

describe('MapRadius hydration', () => {
  it('keeps a hydrated polygon centre instead of letting the mode teardown null it', async () => {
    // The teardown used to run from a pre-flush watcher on activeMode, i.e.
    // after hydrate() had already written the centre.
    const { wrapper } = await mountMapRadius(polygonState([2.35, 48.85]))
    wrapper.vm.$emit('update:modelValue')
    await nextTick()
    const state = wrapper.props('modelValue') as MapRadiusState
    expect(state.center).toEqual([2.35, 48.85])
  })

  it('clears the circle source when hydrating a radius state with no circles', async () => {
    const { wrapper, api } = await mountMapRadius(radiusState([
      { id: 'a', name: 'Paris', center: [2.35, 48.85], radiusKm: 20, color: '#3b82f6' },
    ]))
    api.clearCircle.mockClear()

    await wrapper.setProps({ modelValue: radiusState([]) })
    await nextTick()

    expect(api.clearCircle).toHaveBeenCalled()
    expect(api.removeCenterMarker).toHaveBeenCalledWith('a')
  })

  it('renders hydrated circles and fits the camera to them', async () => {
    const { api } = await mountMapRadius(radiusState([
      { id: 'a', name: 'Paris', center: [2.35, 48.85], radiusKm: 20, color: '#3b82f6' },
      { id: 'b', name: 'Lyon', center: [4.83, 45.76], radiusKm: 30, color: '#ef4444' },
    ]))

    const collection = api.updateCircle.mock.calls.at(-1)?.[0]
    expect(collection.features).toHaveLength(2)
    expect(api.setCenterMarker).toHaveBeenCalledWith('a', [2.35, 48.85], expect.anything())
    expect(api.setCenterMarker).toHaveBeenCalledWith('b', [4.83, 45.76], expect.anything())
    expect(api.fitBounds).toHaveBeenCalled()
  })

  it('does not re-hydrate from its own emitted state', async () => {
    const { wrapper, api } = await mountMapRadius(radiusState([
      { id: 'a', name: 'Paris', center: [2.35, 48.85], radiusKm: 20, color: '#3b82f6' },
      { id: 'b', name: 'Lyon', center: [4.83, 45.76], radiusKm: 30, color: '#ef4444' },
    ]))

    // Produce an emission, then do what a v-model parent does: hand the very
    // same object back. Re-hydrating it would rebuild every marker.
    wrapper.findComponent({ name: 'VMPZoneList' }).vm.$emit('select', 'b')
    await nextTick()
    api.removeCenterMarker.mockClear()
    api.setCenterMarker.mockClear()

    await wrapper.setProps({ modelValue: lastEmitted(wrapper) })
    await nextTick()

    expect(api.removeCenterMarker).not.toHaveBeenCalled()
    expect(api.setCenterMarker).not.toHaveBeenCalled()
  })
})

describe('MapRadius selection and mode', () => {
  it('emits the newly selected circle instead of leaving the model on the previous one', async () => {
    const { wrapper } = await mountMapRadius(radiusState([
      { id: 'a', name: 'Paris', center: [2.35, 48.85], radiusKm: 20, color: '#3b82f6' },
      { id: 'b', name: 'Lyon', center: [4.83, 45.76], radiusKm: 30, color: '#ef4444' },
    ]))

    wrapper.findComponent({ name: 'VMPZoneList' }).vm.$emit('select', 'b')
    await nextTick()

    const state = lastEmitted(wrapper)
    expect(state.name).toBe('Lyon')
    expect(state.center).toEqual([4.83, 45.76])
    expect(state.radiusKm).toBe(30)
  })

  it('tears the radius mode down once when switching to polygon, and emits once', async () => {
    const { wrapper, api } = await mountMapRadius(radiusState([
      { id: 'a', name: 'Paris', center: [2.35, 48.85], radiusKm: 20, color: '#3b82f6' },
    ]))
    const before = (wrapper.emitted('update:modelValue') ?? []).length

    wrapper.findComponent({ name: 'VMPModeToggle' }).vm.$emit('update:mode', 'polygon')
    await nextTick()

    expect(api.removeCenterMarker).toHaveBeenCalledWith('a')
    expect(api.clearCircle).toHaveBeenCalled()
    expect(api.hideRadiusTooltip).toHaveBeenCalled()
    expect((wrapper.emitted('update:modelValue') ?? []).length - before).toBe(1)

    const state = lastEmitted(wrapper)
    expect(state.mode).toBe('polygon')
    expect(state.circles).toEqual([])
  })

  it('ignores a mode switch to the mode already active', async () => {
    const { wrapper } = await mountMapRadius(radiusState([]))
    const before = (wrapper.emitted('update:modelValue') ?? []).length

    wrapper.findComponent({ name: 'VMPModeToggle' }).vm.$emit('update:mode', 'radius')
    await nextTick()

    expect((wrapper.emitted('update:modelValue') ?? []).length).toBe(before)
  })
})
