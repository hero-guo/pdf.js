# PDF.js 固定页面宽度实现指南

## 概述

在PDF.js中实现固定页面宽度有多种方法，每种方法适用于不同的场景。本指南详细介绍各种实现方式。

## 方法一：通过缩放值设置固定宽度

### 1. 计算所需缩放值

```javascript
function calculateScaleForFixedWidth(targetWidth, currentPageWidth) {
  return targetWidth / currentPageWidth;
}

// 示例：设置页面宽度为800px
const targetWidth = 800;
const currentPageWidth = pdfViewer._pages[0].width; // 获取当前页面宽度
const fixedScale = calculateScaleForFixedWidth(targetWidth, currentPageWidth);

// 应用固定缩放
pdfViewer.currentScale = fixedScale;
```

### 2. 监听窗口变化并保持固定宽度

```javascript
let isFixedWidthMode = true;
let fixedPageWidth = 800; // 目标宽度

function maintainFixedWidth() {
  if (!isFixedWidthMode || !pdfViewer.pdfDocument) return;
  
  const currentPage = pdfViewer._pages[pdfViewer._currentPageNumber - 1];
  if (currentPage) {
    const requiredScale = fixedPageWidth / currentPage.width;
    pdfViewer.currentScale = requiredScale;
  }
}

// 监听窗口变化
window.addEventListener('resize', maintainFixedWidth);

// 监听页面变化
pdfViewer.eventBus._on('pagechanging', maintainFixedWidth);
```

## 方法二：自定义缩放模式

### 1. 扩展缩放选项

```javascript
// 在 pdf_viewer.js 的 #setScale 方法中添加新的缩放模式
case "fixed-width":
  // 固定宽度模式
  const fixedWidth = options.fixedWidth || 800;
  scale = (fixedWidth / currentPage.width) * currentPage.scale;
  break;
```

### 2. 创建固定宽度控制器

```javascript
class FixedWidthController {
  constructor(pdfViewer, targetWidth = 800) {
    this.pdfViewer = pdfViewer;
    this.targetWidth = targetWidth;
    this.isActive = false;
    this.init();
  }

  init() {
    // 监听缩放变化事件
    this.pdfViewer.eventBus._on('scalechanging', (evt) => {
      if (this.isActive && evt.presetValue !== 'fixed-width') {
        // 如果不是固定宽度模式触发的变化，重新应用固定宽度
        this.apply();
      }
    });
  }

  activate() {
    this.isActive = true;
    this.apply();
  }

  deactivate() {
    this.isActive = false;
  }

  setWidth(width) {
    this.targetWidth = width;
    if (this.isActive) {
      this.apply();
    }
  }

  apply() {
    if (!this.pdfViewer.pdfDocument) return;

    const currentPage = this.pdfViewer._pages[this.pdfViewer._currentPageNumber - 1];
    if (currentPage) {
      const scale = this.targetWidth / currentPage.width;
      this.pdfViewer.currentScale = scale;
    }
  }
}

// 使用示例
const fixedWidthController = new FixedWidthController(pdfViewer, 800);
fixedWidthController.activate();
```

## 方法三：CSS 方式实现固定宽度

### 1. 通过 CSS 变量控制

```css
.pdfViewer.fixedWidth .page {
  --fixed-page-width: 800px;
  width: var(--fixed-page-width) !important;
  transform-origin: top left;
}

.pdfViewer.fixedWidth .canvasWrapper {
  transform-origin: top left;
}
```

```javascript
// 应用固定宽度CSS类
function enableFixedWidthCSS(targetWidth) {
  const viewer = document.querySelector('.pdfViewer');
  viewer.classList.add('fixedWidth');
  viewer.style.setProperty('--fixed-page-width', `${targetWidth}px`);
  
  // 计算缩放比例
  const pages = viewer.querySelectorAll('.page');
  pages.forEach(page => {
    const originalWidth = parseInt(page.style.width) || 816; // 默认宽度
    const scale = targetWidth / originalWidth;
    page.style.transform = `scale(${scale})`;
  });
}
```

## 方法四：修改 viewport 设置

### 1. 在页面创建时设置固定宽度

```javascript
// 修改 PDFPageView 的构造函数
class CustomPDFPageView extends PDFPageView {
  constructor(options) {
    super(options);
    this.fixedWidth = options.fixedWidth;
  }

  setPdfPage(pdfPage) {
    super.setPdfPage(pdfPage);
    
    if (this.fixedWidth) {
      // 重新计算 viewport 以适应固定宽度
      const scale = this.fixedWidth / this.viewport.width;
      this.viewport = pdfPage.getViewport({
        scale: scale * PixelsPerInch.PDF_TO_CSS_UNITS,
        rotation: this.viewport.rotation,
      });
      this.#setDimensions();
    }
  }
}
```

## 方法五：工具栏集成

### 1. 添加固定宽度控件

```html
<div id="fixedWidthContainer">
  <label for="fixedWidthToggle">固定宽度:</label>
  <input type="checkbox" id="fixedWidthToggle">
  <input type="number" id="fixedWidthInput" value="800" min="200" max="2000" step="50">
  <span>px</span>
</div>
```

```javascript
// 工具栏控制逻辑
class FixedWidthToolbar {
  constructor(pdfViewer) {
    this.pdfViewer = pdfViewer;
    this.toggle = document.getElementById('fixedWidthToggle');
    this.input = document.getElementById('fixedWidthInput');
    this.controller = new FixedWidthController(pdfViewer);
    
    this.init();
  }

  init() {
    this.toggle.addEventListener('change', (e) => {
      if (e.target.checked) {
        const width = parseInt(this.input.value);
        this.controller.setWidth(width);
        this.controller.activate();
      } else {
        this.controller.deactivate();
        // 恢复自适应模式
        this.pdfViewer.currentScaleValue = 'auto';
      }
    });

    this.input.addEventListener('change', (e) => {
      if (this.toggle.checked) {
        const width = parseInt(e.target.value);
        this.controller.setWidth(width);
      }
    });
  }
}
```

## 实际应用示例

### 完整的固定宽度实现

```javascript
// 完整的固定宽度解决方案
class PDFFixedWidthManager {
  constructor(pdfViewer, options = {}) {
    this.pdfViewer = pdfViewer;
    this.options = {
      defaultWidth: 800,
      minWidth: 200,
      maxWidth: 2000,
      saveToLocalStorage: true,
      ...options
    };
    
    this.isActive = false;
    this.currentWidth = this.options.defaultWidth;
    
    this.init();
  }

  init() {
    // 从本地存储恢复设置
    if (this.options.saveToLocalStorage) {
      const saved = localStorage.getItem('pdfFixedWidth');
      if (saved) {
        const settings = JSON.parse(saved);
        this.currentWidth = settings.width;
        this.isActive = settings.active;
      }
    }

    // 监听文档加载
    this.pdfViewer.eventBus._on('documentloaded', () => {
      if (this.isActive) {
        this.apply();
      }
    });

    // 监听页面变化
    this.pdfViewer.eventBus._on('pagechanging', () => {
      if (this.isActive) {
        this.apply();
      }
    });
  }

  enable(width = this.currentWidth) {
    this.isActive = true;
    this.currentWidth = Math.max(this.options.minWidth, 
                               Math.min(this.options.maxWidth, width));
    this.apply();
    this.saveSettings();
  }

  disable() {
    this.isActive = false;
    // 恢复到自适应模式
    this.pdfViewer.currentScaleValue = 'auto';
    this.saveSettings();
  }

  setWidth(width) {
    this.currentWidth = Math.max(this.options.minWidth, 
                               Math.min(this.options.maxWidth, width));
    if (this.isActive) {
      this.apply();
    }
    this.saveSettings();
  }

  apply() {
    if (!this.pdfViewer.pdfDocument || !this.isActive) return;

    const currentPage = this.pdfViewer._pages[this.pdfViewer._currentPageNumber - 1];
    if (currentPage) {
      const scale = this.currentWidth / currentPage.width;
      this.pdfViewer.currentScale = scale;
    }
  }

  saveSettings() {
    if (this.options.saveToLocalStorage) {
      localStorage.setItem('pdfFixedWidth', JSON.stringify({
        active: this.isActive,
        width: this.currentWidth
      }));
    }
  }

  getStatus() {
    return {
      isActive: this.isActive,
      currentWidth: this.currentWidth,
      currentScale: this.pdfViewer.currentScale
    };
  }
}

// 使用示例
const fixedWidthManager = new PDFFixedWidthManager(pdfViewer, {
  defaultWidth: 800,
  saveToLocalStorage: true
});

// 启用固定宽度
fixedWidthManager.enable(900);

// 调整宽度
fixedWidthManager.setWidth(1000);

// 禁用固定宽度
fixedWidthManager.disable();
```

## 注意事项

1. **性能考虑**: 频繁的缩放操作可能影响性能，建议添加防抖处理
2. **响应式设计**: 在移动设备上可能需要不同的固定宽度策略
3. **打印支持**: 固定宽度模式下打印可能需要特殊处理
4. **无障碍性**: 确保固定宽度功能对屏幕阅读器友好

## 兼容性

- 支持 PDF.js 2.0+ 版本
- 兼容现代浏览器（Chrome 60+, Firefox 55+, Safari 12+）
- 移动端浏览器需要额外的触摸优化

通过以上方法，您可以根据具体需求选择最适合的固定页面宽度实现方案。