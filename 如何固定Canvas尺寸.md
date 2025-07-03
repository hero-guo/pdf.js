# 如何固定 Canvas 尺寸

在 PDF.js 中，有多种方法可以固定或控制 Canvas 的尺寸。以下是几种主要的实现方式：

## 方法一：通过配置选项控制

### 1. 设置最大像素数限制
```javascript
// 设置固定的最大像素数（例如：1920x1080 = 2,073,600 像素）
const fixedMaxPixels = 1920 * 1080;

const pdfjsLib = window['pdfjs-dist/build/pdf'];
pdfjsLib.GlobalWorkerOptions.workerSrc = './pdf.worker.js';

// 在创建 PDFViewer 时设置选项
const pdfViewer = new PDFViewer({
  container: document.getElementById('viewerContainer'),
  maxCanvasPixels: fixedMaxPixels,  // 固定最大像素数
  maxCanvasDim: 1920,               // 固定最大尺寸（宽或高）
});
```

### 2. 通过 AppOptions 全局设置
```javascript
// 设置全局选项
pdfjsLib.AppOptions.set('maxCanvasPixels', 1920 * 1080);
pdfjsLib.AppOptions.set('maxCanvasDim', 1920);
pdfjsLib.AppOptions.set('capCanvasAreaFactor', 0); // 禁用区域限制因子
```

## 方法二：强制固定缩放

### 1. 禁用自适应缩放
```javascript
const pdfViewer = new PDFViewer({
  container: document.getElementById('viewerContainer'),
  maxCanvasPixels: 0,  // 设置为 0 禁用像素限制
});
```

### 2. 手动控制输出缩放
```javascript
class FixedOutputScale {
  constructor(fixedWidth, fixedHeight) {
    this.fixedWidth = fixedWidth;
    this.fixedHeight = fixedHeight;
    this.sx = 1;
    this.sy = 1;
  }
  
  get scaled() {
    return this.sx !== 1 || this.sy !== 1;
  }
  
  get symmetric() {
    return this.sx === this.sy;
  }
  
  limitCanvas(width, height, maxPixels, maxDim, capAreaFactor = -1) {
    // 计算固定尺寸的缩放比例
    const scaleX = this.fixedWidth / width;
    const scaleY = this.fixedHeight / height;
    
    // 使用较小的缩放比例保持纵横比
    const scale = Math.min(scaleX, scaleY);
    
    this.sx = scale;
    this.sy = scale;
    
    return false; // 不报告限制
  }
}
```

## 方法三：直接设置 Canvas 尺寸

### 在渲染时固定尺寸
```javascript
async function renderPageWithFixedSize(pdfPage, canvas, fixedWidth, fixedHeight) {
  // 设置固定的 canvas 尺寸
  canvas.width = fixedWidth;
  canvas.height = fixedHeight;
  
  // 获取页面视口
  const viewport = pdfPage.getViewport({ scale: 1 });
  
  // 计算缩放比例以适应固定尺寸
  const scaleX = fixedWidth / viewport.width;
  const scaleY = fixedHeight / viewport.height;
  const scale = Math.min(scaleX, scaleY); // 保持纵横比
  
  // 重新计算视口
  const scaledViewport = pdfPage.getViewport({ scale });
  
  // 计算居中偏移
  const offsetX = (fixedWidth - scaledViewport.width) / 2;
  const offsetY = (fixedHeight - scaledViewport.height) / 2;
  
  const renderContext = {
    canvasContext: canvas.getContext('2d'),
    viewport: scaledViewport,
    transform: [scale, 0, 0, scale, offsetX, offsetY]
  };
  
  await pdfPage.render(renderContext).promise;
}
```

## 方法四：CSS 控制显示尺寸

### 固定容器尺寸
```css
.pdf-container {
  width: 800px;
  height: 600px;
  overflow: hidden;
}

.pdf-canvas {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain; /* 保持纵横比并适应容器 */
}
```

### JavaScript 配合 CSS
```javascript
function setupFixedSizeViewer(containerWidth, containerHeight) {
  const container = document.getElementById('viewerContainer');
  container.style.width = `${containerWidth}px`;
  container.style.height = `${containerHeight}px`;
  container.style.overflow = 'hidden';
  
  const pdfViewer = new PDFViewer({
    container: container,
    // 根据容器尺寸计算最大像素数
    maxCanvasPixels: containerWidth * containerHeight,
    maxCanvasDim: Math.max(containerWidth, containerHeight),
  });
  
  return pdfViewer;
}
```

## 配置选项详解

### maxCanvasPixels
- **作用**: 限制 Canvas 的总像素数
- **默认值**: 33,554,432 (2^25)
- **移动设备默认值**: 5,242,880
- **设置为 0**: 禁用像素限制（使用原始尺寸）

### maxCanvasDim
- **作用**: 限制 Canvas 的最大尺寸（宽度或高度）
- **默认值**: 32,767
- **用途**: 防止单个维度过大

### capCanvasAreaFactor
- **作用**: 基于屏幕尺寸的区域限制因子
- **默认值**: 200（表示屏幕面积的200%）
- **设置为 0 或负数**: 禁用此限制

## 实际应用示例

### 示例1：固定为 1920x1080 显示
```javascript
const pdfjsLib = window['pdfjs-dist/build/pdf'];

// 设置固定尺寸
const FIXED_WIDTH = 1920;
const FIXED_HEIGHT = 1080;

async function initFixedSizePDFViewer(pdfUrl) {
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  const page = await pdf.getPage(1);
  
  const canvas = document.getElementById('pdfCanvas');
  canvas.width = FIXED_WIDTH;
  canvas.height = FIXED_HEIGHT;
  
  const viewport = page.getViewport({ scale: 1 });
  const scale = Math.min(FIXED_WIDTH / viewport.width, FIXED_HEIGHT / viewport.height);
  const scaledViewport = page.getViewport({ scale });
  
  const renderContext = {
    canvasContext: canvas.getContext('2d'),
    viewport: scaledViewport
  };
  
  await page.render(renderContext).promise;
}
```

### 示例2：响应式固定比例
```javascript
function createResponsiveFixedViewer() {
  // 固定 16:9 比例
  const aspectRatio = 16 / 9;
  
  function updateCanvasSize() {
    const container = document.getElementById('viewerContainer');
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    let canvasWidth, canvasHeight;
    
    if (containerWidth / containerHeight > aspectRatio) {
      // 容器更宽，以高度为准
      canvasHeight = containerHeight;
      canvasWidth = canvasHeight * aspectRatio;
    } else {
      // 容器更高，以宽度为准
      canvasWidth = containerWidth;
      canvasHeight = canvasWidth / aspectRatio;
    }
    
    // 设置 PDF.js 的限制
    pdfjsLib.AppOptions.set('maxCanvasPixels', canvasWidth * canvasHeight);
    pdfjsLib.AppOptions.set('maxCanvasDim', Math.max(canvasWidth, canvasHeight));
  }
  
  window.addEventListener('resize', updateCanvasSize);
  updateCanvasSize();
}
```

## 注意事项

1. **性能影响**: 固定大尺寸可能影响性能，特别是在低端设备上
2. **内存使用**: 大的 Canvas 会占用更多内存
3. **纵横比**: 注意保持 PDF 页面的原始纵横比
4. **浏览器限制**: 不同浏览器对 Canvas 尺寸有不同的限制
5. **缩放质量**: 过度缩放可能影响显示质量

选择适合你应用场景的方法，通常建议结合多种方法来达到最佳效果。