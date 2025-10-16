export function TestTransformAssetUrl() {
  return vine`
    <div class="test-transform-asset-url">
      <img src="@/assets/sample.jpg" alt="sample" />
      <img src="https://placehold.co/200x100" alt="placeholder" />
    </div>
  `
}
