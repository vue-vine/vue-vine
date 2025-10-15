import sample2 from '@/assets/sample2.jpg'

export function TestTransformAssetUrl() {
  vineStyle(`
    .test-transform-asset-url {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 2rem;
      max-width: 600px;
      margin: 0 auto;
    }

    .test-transform-asset-url img {
      max-width: 200px;
      height: auto;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .img-list {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
  `)

  return vine`
    <div class="test-transform-asset-url">
      <h2>Transform Asset URL Test</h2>
      <p>Testing image path transformation with @/ alias</p>
      <div class="img-list">
        <img src="@/assets/sample1.jpg" alt="sample1" class="test-image" />
        <img :src="sample2" alt="sample2" class="test-image" />
        <img
          src="https://cdn.pixabay.com/photo/2015/10/11/17/21/vine-982640_1280.jpg"
          alt="sample3"
          class="test-image"
        />
      </div>
    </div>
  `
}
