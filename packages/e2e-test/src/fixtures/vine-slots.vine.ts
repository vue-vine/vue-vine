import { ref } from 'vue'

// Component with default slot
export function DefaultSlotComponent() {
  vineStyle.scoped(`
    .default-slot-wrapper {
      padding: 1rem;
      border: 2px solid #42b883;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .slot-label {
      font-weight: bold;
      color: #42b883;
      margin-bottom: 0.5rem;
    }
  `)

  return vine`
    <div class="default-slot-wrapper">
      <div class="slot-label">Default Slot:</div>
      <slot />
    </div>
  `
}

// Component with named slots
export function NamedSlotComponent() {
  vineStyle.scoped(`
    .named-slot-wrapper {
      padding: 1rem;
      border: 2px solid #e74c3c;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .slot-section {
      margin-bottom: 0.5rem;
    }
    .slot-label {
      font-weight: bold;
      color: #e74c3c;
      margin-bottom: 0.25rem;
    }
  `)

  return vine`
    <div class="named-slot-wrapper">
      <div class="slot-section header">
        <div class="slot-label">Header Slot:</div>
        <slot name="header" />
      </div>
      <div class="slot-section default">
        <div class="slot-label">Default Slot:</div>
        <slot />
      </div>
      <div class="slot-section footer">
        <div class="slot-label">Footer Slot:</div>
        <slot name="footer" />
      </div>
    </div>
  `
}

// Component with scoped slots
export function ScopedSlotComponent() {
  const items = ref([
    { id: 1, name: 'Apple', price: 1.5 },
    { id: 2, name: 'Banana', price: 0.8 },
    { id: 3, name: 'Orange', price: 2.0 }
  ])

  vineStyle.scoped(`
    .scoped-slot-wrapper {
      padding: 1rem;
      border: 2px solid #9b59b6;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .slot-label {
      font-weight: bold;
      color: #9b59b6;
      margin-bottom: 0.5rem;
    }
  `)

  return vine`
    <div class="scoped-slot-wrapper">
      <div class="slot-label">Scoped Slot (Item List):</div>
      <div class="item-list" v-for="item in items" :key="item.id">
        <slot :item="item" :itemIndex="item.id" />
      </div>
    </div>
  `
}

// Component with conditional slots
export function SlotWithFallbackComponent() {
  vineStyle.scoped(`
    .conditional-slot-wrapper {
      padding: 1rem;
      border: 2px solid #f39c12;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .slot-label {
      font-weight: bold;
      color: #f39c12;
      margin-bottom: 0.5rem;
    }
    .fallback {
      color: #666;
      font-style: italic;
    }
  `)

  return vine`
    <div class="slot-with-fallback-wrapper">
      <div class="slot-label">Conditional Slot with Fallback:</div>
      <slot>
        <div class="fallback">
          This is fallback content when no slot is provided
        </div>
      </slot>
    </div>
`
}

export function TestVineSlots() {
  const message = ref('Hello from slot content!')

  vineStyle.scoped(`
    .test-vine-slots {
      padding: 2rem;
      max-width: 400px;
    }
    .section {
      margin-bottom: 2rem;
    }
    .section-title {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 1rem;
      color: #2c3e50;
    }
    .custom-content {
      background-color: #f8f9fa;
      padding: 0.5rem;
      border-radius: 4px;
      margin: 0.25rem 0;
    }
    .item-display {
      background-color: #e8f5e8;
      padding: 0.5rem;
      margin: 0.25rem 0;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
    }
    .price {
      font-weight: bold;
      color: #27ae60;
    }
  `)

  return vine`
    <div class="test-vine-slots">
      <h1>Test Vine Slots</h1>

      <div class="section default-slot">
        <h2 class="section-title">1. Default Slot</h2>
        <DefaultSlotComponent>
          <div class="custom-content">{{ message }}</div>
        </DefaultSlotComponent>
      </div>

      <div class="section named-slots">
        <h2 class="section-title">2. Named Slots</h2>
        <NamedSlotComponent>
          <template #header>
            <div class="custom-content">This is the header content</div>
          </template>

          <div class="custom-content">This is the default slot content</div>

          <template #footer>
            <div class="custom-content">This is the footer content</div>
          </template>
        </NamedSlotComponent>
      </div>

      <div class="section scoped-slots">
        <h2 class="section-title">3. Scoped Slots</h2>
        <ScopedSlotComponent>
          <template v-slot:default="slotProps">
            <div class="item-display">
              <span>{{ slotProps.itemIndex }}. {{ slotProps.item.name }}</span>
              <span class="price">{{ slotProps.item.price }}</span>
            </div>
          </template>
        </ScopedSlotComponent>
      </div>

      <div class="section slot-with-fallback">
        <h2 class="section-title">4. Slot with fallback</h2>
        <SlotWithFallbackComponent>
          <div class="custom-content">Custom content provided!</div>
        </SlotWithFallbackComponent>
        <SlotWithFallbackComponent />
      </div>
    </div>
  `
}
