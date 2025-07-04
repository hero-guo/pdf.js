# PDF.js 黄金比例缩放设计方案

## 设计理念

基于黄金比例（φ ≈ 1.618）的视觉美学原理，为PDF页面提供更加优雅和舒适的阅读体验。每页根据容器可视宽度计算出黄金比例的理想宽度作为基准，再据此计算最优缩放值。

## 黄金比例基础理论

### 黄金比例常数
```javascript
const GOLDEN_RATIO = (1 + Math.sqrt(5)) / 2; // ≈ 1.618033988749895
const GOLDEN_RATIO_INVERSE = 1 / GOLDEN_RATIO; // ≈ 0.618033988749895
```

### 黄金比例在UI设计中的应用
- **视觉舒适度**：符合人眼自然观察习惯
- **信息层次**：帮助建立良好的视觉层次结构
- **阅读节奏**：提供更自然的阅读体验

## 核心算法设计

### 1. 黄金比例基准宽度计算

```javascript
class GoldenRatioCalculator {
  static calculateGoldenWidth(containerWidth, mode = 'primary') {
    switch (mode) {
      case 'primary':
        // 容器宽度作为黄金比例的长边
        return containerWidth * GOLDEN_RATIO_INVERSE; // ≈ 0.618 * containerWidth
      
      case 'secondary':
        // 容器宽度作为黄金比例的短边
        return containerWidth * GOLDEN_RATIO; // ≈ 1.618 * containerWidth
      
      case 'balanced':
        // 平衡模式：使用黄金比例的平方根
        return containerWidth * Math.sqrt(GOLDEN_RATIO_INVERSE); // ≈ 0.786 * containerWidth
      
      case 'reading':
        // 阅读优化模式：基于认知科学的最佳阅读宽度
        const idealReadingWidth = containerWidth * 0.65; // 经验值
        return Math.min(idealReadingWidth, containerWidth * GOLDEN_RATIO_INVERSE);
      
      default:
        return containerWidth * GOLDEN_RATIO_INVERSE;
    }
  }
  
  // 计算黄金比例相关的高度
  static calculateGoldenHeight(width) {
    return width / GOLDEN_RATIO;
  }
  
  // 验证宽高比是否接近黄金比例
  static isGoldenRatio(width, height, tolerance = 0.05) {
    const ratio = width / height;
    return Math.abs(ratio - GOLDEN_RATIO) <= tolerance;
  }
}
```

### 2. 改进的PageScaleManager

```javascript
class GoldenRatioPageScaleManager extends PageScaleManager {
  #goldenRatioMode = 'primary'; // 'primary', 'secondary', 'balanced', 'reading'
  #adaptiveGoldenRatio = true;  // 是否根据页面特性自适应选择黄金比例模式
  
  constructor(viewer, options = {}) {
    super(viewer);
    this.#goldenRatioMode = options.goldenRatioMode || 'primary';
    this.#adaptiveGoldenRatio = options.adaptiveGoldenRatio ?? true;
  }
  
  // 核心方法：基于黄金比例计算页面缩放
  #calculateGoldenRatioScale(pageView, scaleMode) {
    const container = this.#viewer.container;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // 计算填充
    const { hPadding, vPadding } = this.#calculatePadding();
    const availableWidth = containerWidth - hPadding;
    const availableHeight = containerHeight - vPadding;
    
    // 根据页面特性选择黄金比例模式
    const goldenMode = this.#adaptiveGoldenRatio 
      ? this.#selectOptimalGoldenMode(pageView, availableWidth, availableHeight)
      : this.#goldenRatioMode;
    
    // 计算黄金比例基准宽度
    const goldenWidth = GoldenRatioCalculator.calculateGoldenWidth(availableWidth, goldenMode);
    
    // 基于黄金比例宽度计算缩放
    return this.#calculateScaleFromGoldenWidth(pageView, goldenWidth, availableHeight, scaleMode);
  }
  
  // 自适应选择最佳黄金比例模式
  #selectOptimalGoldenMode(pageView, availableWidth, availableHeight) {
    const pageAspectRatio = pageView.width / pageView.height;
    const containerAspectRatio = availableWidth / availableHeight;
    
    // 分析页面特性
    const isLandscape = pageAspectRatio > 1.2;
    const isPortrait = pageAspectRatio < 0.8;
    const isWideContainer = containerAspectRatio > 1.5;
    const isNarrowContainer = containerAspectRatio < 1.0;
    
    // 智能选择模式
    if (isLandscape && isWideContainer) {
      return 'secondary'; // 横向页面+宽屏：使用较大的黄金比例宽度
    } else if (isPortrait && isNarrowContainer) {
      return 'primary';   // 纵向页面+窄屏：使用较小的黄金比例宽度
    } else if (this.#isTextHeavyPage(pageView)) {
      return 'reading';   // 文本密集页面：使用阅读优化模式
    } else {
      return 'balanced';  // 平衡模式：适用于大多数情况
    }
  }
  
  // 基于黄金比例宽度计算具体缩放值
  #calculateScaleFromGoldenWidth(pageView, goldenWidth, availableHeight, scaleMode) {
    const pageWidthScaleFactor = this.#getPageWidthScaleFactor();
    
    // 基础黄金比例缩放
    const goldenWidthScale = (goldenWidth / pageView.width) * pageView.scale / pageWidthScaleFactor;
    
    // 高度约束缩放
    const heightScale = (availableHeight / pageView.height) * pageView.scale;
    
    switch (scaleMode) {
      case "golden-width":
        return goldenWidthScale;
      
      case "golden-fit":
        // 黄金比例适配：优先使用黄金宽度，但不超过高度限制
        return Math.min(goldenWidthScale, heightScale);
      
      case "golden-height":
        // 基于黄金比例高度计算
        const goldenHeight = GoldenRatioCalculator.calculateGoldenHeight(goldenWidth);
        return Math.min(goldenWidthScale, (goldenHeight / pageView.height) * pageView.scale);
      
      case "golden-auto":
        // 智能黄金比例：根据页面特性自动选择
        return this.#calculateAdaptiveGoldenScale(pageView, goldenWidthScale, heightScale);
      
      case "page-actual":
        return 1;
      
      // 兼容传统模式
      case "page-width":
      case "page-height":
      case "page-fit":
      case "auto":
        return this.#calculateTraditionalScale(pageView, scaleMode);
      
      default:
        return goldenWidthScale;
    }
  }
  
  // 智能自适应黄金比例缩放
  #calculateAdaptiveGoldenScale(pageView, goldenWidthScale, heightScale) {
    const pageAspectRatio = pageView.width / pageView.height;
    
    // 页面接近黄金比例时，优先使用黄金宽度缩放
    if (GoldenRatioCalculator.isGoldenRatio(pageView.width, pageView.height)) {
      return goldenWidthScale;
    }
    
    // 宽页面：倾向于使用黄金宽度
    if (pageAspectRatio > GOLDEN_RATIO) {
      return Math.min(goldenWidthScale, heightScale * 1.1); // 允许稍微超出高度
    }
    
    // 窄页面：在黄金宽度和高度限制之间平衡
    if (pageAspectRatio < GOLDEN_RATIO_INVERSE) {
      return Math.min(goldenWidthScale * 0.9, heightScale);
    }
    
    // 标准页面：使用严格的黄金适配
    return Math.min(goldenWidthScale, heightScale);
  }
  
  // 检测是否为文本密集页面（简化实现）
  #isTextHeavyPage(pageView) {
    // 这里可以通过分析页面内容来判断
    // 简化实现：基于页面尺寸比例推测
    const aspectRatio = pageView.width / pageView.height;
    return aspectRatio > 0.7 && aspectRatio < 1.3; // 接近标准文档比例
  }
  
  // 计算填充（考虑黄金比例美学）
  #calculatePadding() {
    const viewer = this.#viewer;
    let hPadding = SCROLLBAR_PADDING;
    let vPadding = VERTICAL_PADDING;
    
    // 应用黄金比例到填充计算
    if (viewer.isInPresentationMode) {
      hPadding = vPadding = 4;
      if (viewer._spreadMode !== SpreadMode.NONE) {
        hPadding *= GOLDEN_RATIO; // 使用黄金比例调整双页模式填充
      }
    } else if (viewer.removePageBorders) {
      hPadding = vPadding = 0;
    } else if (viewer._scrollMode === ScrollMode.HORIZONTAL) {
      [hPadding, vPadding] = [vPadding * GOLDEN_RATIO_INVERSE, hPadding * GOLDEN_RATIO_INVERSE];
    }
    
    return { hPadding, vPadding };
  }
  
  // 传统缩放模式的计算（作为备选）
  #calculateTraditionalScale(pageView, mode) {
    // 调用父类的传统计算方法
    return super.calculatePageScale(pageView.id, mode);
  }
}
```

### 3. 黄金比例缩放模式定义

```javascript
const GoldenRatioScaleModes = {
  GOLDEN_WIDTH: 'golden-width',     // 严格按黄金比例宽度缩放
  GOLDEN_FIT: 'golden-fit',         // 黄金比例适配（考虑高度限制）
  GOLDEN_HEIGHT: 'golden-height',   // 基于黄金比例高度缩放
  GOLDEN_AUTO: 'golden-auto',       // 智能黄金比例缩放
  GOLDEN_READING: 'golden-reading', // 黄金比例阅读模式
};

const GoldenRatioModes = {
  PRIMARY: 'primary',     // 容器宽度为黄金比例长边 (≈ 0.618x)
  SECONDARY: 'secondary', // 容器宽度为黄金比例短边 (≈ 1.618x)
  BALANCED: 'balanced',   // 平衡模式 (≈ 0.786x)
  READING: 'reading',     // 阅读优化模式
};
```

### 4. PDFViewer集成

```javascript
class PDFViewer {
  constructor(options) {
    // ... 现有代码 ...
    
    // 黄金比例缩放配置
    const goldenRatioOptions = {
      enabled: options.enableGoldenRatioScaling ?? false,
      mode: options.goldenRatioMode || GoldenRatioModes.PRIMARY,
      adaptiveMode: options.adaptiveGoldenRatio ?? true,
      defaultScaleMode: options.defaultGoldenScaleMode || GoldenRatioScaleModes.GOLDEN_FIT,
    };
    
    if (goldenRatioOptions.enabled) {
      this.#pageScaleManager = new GoldenRatioPageScaleManager(this, goldenRatioOptions);
    } else {
      this.#pageScaleManager = new PageScaleManager(this);
    }
  }
  
  // 扩展缩放设置方法
  #setScale(value, options) {
    // 检查是否为黄金比例模式
    if (this.#isGoldenRatioMode(value)) {
      options.preset = true;
      this.#setGoldenRatioScale(value, options);
    } else if (typeof value === 'number' && value > 0) {
      options.preset = false;
      this.#setUniformScale(value, options);
    } else {
      options.preset = true;
      this.#setAdaptiveScale(value, options);
    }
  }
  
  // 黄金比例模式判断
  #isGoldenRatioMode(value) {
    return Object.values(GoldenRatioScaleModes).includes(value);
  }
  
  // 设置黄金比例缩放
  #setGoldenRatioScale(mode, options) {
    this.#pageScaleManager.setScaleMode(mode);
    this.#applyGoldenRatioScaling(options);
  }
  
  // 应用黄金比例缩放
  #applyGoldenRatioScaling(options) {
    const visiblePages = this._getVisiblePages();
    
    // 更新当前缩放值（使用当前页面的黄金比例缩放）
    if (visiblePages.views.length > 0) {
      const currentPageNumber = this._currentPageNumber;
      this._currentScale = this.#pageScaleManager.getPageScale(currentPageNumber);
      this._currentScaleValue = this.#pageScaleManager.getScaleMode();
    }
    
    this.#refreshWithGoldenRatioScaling(options);
  }
  
  // 使用黄金比例缩放刷新页面
  #refreshWithGoldenRatioScaling(options = {}) {
    const { noScroll = false, drawingDelay = -1 } = options;
    
    // 为每个页面计算黄金比例缩放
    for (let i = 0; i < this._pages.length; i++) {
      const pageView = this._pages[i];
      const goldenScale = this.#pageScaleManager.getPageScale(i + 1);
      
      pageView.update({
        scale: goldenScale,
        drawingDelay: drawingDelay
      });
    }
    
    // 更新容器样式（使用黄金比例调整的CSS变量）
    this.#updateGoldenRatioCSS();
    
    if (!noScroll) {
      this.#adjustScrollPositionForGoldenRatio();
    }
    
    this.eventBus.dispatch("scalechanging", {
      source: this,
      scale: this._currentScale,
      presetValue: this._currentScaleValue,
      goldenRatio: true, // 标识这是黄金比例缩放
    });
    
    if (this.defaultRenderingQueue) {
      this.update();
    }
  }
  
  // 更新黄金比例相关的CSS变量
  #updateGoldenRatioCSS() {
    const container = this.container;
    const containerWidth = container.clientWidth;
    
    // 设置黄金比例相关的CSS变量
    this.viewer.style.setProperty("--golden-ratio", GOLDEN_RATIO);
    this.viewer.style.setProperty("--golden-ratio-inverse", GOLDEN_RATIO_INVERSE);
    this.viewer.style.setProperty(
      "--golden-width", 
      `${GoldenRatioCalculator.calculateGoldenWidth(containerWidth)}px`
    );
    this.viewer.style.setProperty(
      "--scale-factor",
      this._currentScale * PixelsPerInch.PDF_TO_CSS_UNITS
    );
  }
  
  // 黄金比例模式的滚动调整
  #adjustScrollPositionForGoldenRatio() {
    const currentPageView = this._pages[this._currentPageNumber - 1];
    if (currentPageView) {
      // 使用黄金比例分割点作为滚动焦点
      const goldenFocusY = currentPageView.div.offsetHeight * GOLDEN_RATIO_INVERSE;
      this.#scrollIntoView(currentPageView, {
        top: goldenFocusY,
        left: 0
      });
    }
  }
}
```

### 5. UI扩展：黄金比例控件

```javascript
class GoldenRatioScaleControl {
  constructor(container, pdfViewer) {
    this.container = container;
    this.pdfViewer = pdfViewer;
    this.#createGoldenRatioControls();
  }
  
  #createGoldenRatioControls() {
    // 黄金比例模式选择器
    const goldenModeSelect = document.createElement('select');
    goldenModeSelect.innerHTML = `
      <option value="${GoldenRatioScaleModes.GOLDEN_FIT}">黄金适配</option>
      <option value="${GoldenRatioScaleModes.GOLDEN_WIDTH}">黄金宽度</option>
      <option value="${GoldenRatioScaleModes.GOLDEN_AUTO}">智能黄金</option>
      <option value="${GoldenRatioScaleModes.GOLDEN_READING}">黄金阅读</option>
      <option value="page-fit">标准适配</option>
    `;
    
    goldenModeSelect.addEventListener('change', (e) => {
      this.pdfViewer.currentScaleValue = e.target.value;
    });
    
    // 黄金比例信息显示
    const goldenRatioInfo = document.createElement('div');
    goldenRatioInfo.className = 'golden-ratio-info';
    goldenRatioInfo.innerHTML = `
      <span class="golden-ratio-label">φ</span>
      <span class="golden-ratio-value">1.618</span>
    `;
    
    // 添加到控制面板
    this.container.appendChild(goldenModeSelect);
    this.container.appendChild(goldenRatioInfo);
  }
  
  // 更新显示
  updateDisplay() {
    const currentScale = this.pdfViewer.currentScale;
    const isGoldenRatioMode = this.#isGoldenRatioActive();
    
    // 更新黄金比例指示器
    const goldenRatioInfo = this.container.querySelector('.golden-ratio-info');
    if (goldenRatioInfo) {
      goldenRatioInfo.classList.toggle('active', isGoldenRatioMode);
      
      if (isGoldenRatioMode) {
        const goldenValue = this.#calculateCurrentGoldenRatio();
        goldenRatioInfo.querySelector('.golden-ratio-value').textContent = 
          goldenValue.toFixed(3);
      }
    }
  }
  
  #isGoldenRatioActive() {
    return Object.values(GoldenRatioScaleModes).includes(this.pdfViewer.currentScaleValue);
  }
  
  #calculateCurrentGoldenRatio() {
    const container = this.pdfViewer.container;
    const currentPage = this.pdfViewer._pages[this.pdfViewer._currentPageNumber - 1];
    
    if (currentPage && container) {
      const displayedWidth = currentPage.div.offsetWidth;
      const containerWidth = container.clientWidth;
      return containerWidth / displayedWidth;
    }
    
    return GOLDEN_RATIO;
  }
}
```

### 6. CSS样式支持

```css
/* 黄金比例相关的CSS变量和样式 */
.pdfViewer {
  --golden-ratio: 1.618;
  --golden-ratio-inverse: 0.618;
  --golden-width: calc(var(--viewer-container-width) * var(--golden-ratio-inverse));
}

/* 黄金比例模式下的页面样式 */
.pdfViewer.goldenRatioMode .page {
  /* 使用黄金比例调整页面间距 */
  margin-bottom: calc(var(--page-margin) * var(--golden-ratio-inverse));
}

/* 黄金比例控制面板样式 */
.golden-ratio-info {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 0.25rem;
  font-family: 'Times New Roman', serif;
  opacity: 0.5;
  transition: opacity 0.3s ease;
}

.golden-ratio-info.active {
  opacity: 1;
  background: rgba(255, 215, 0, 0.2);
}

.golden-ratio-label {
  font-weight: bold;
  font-size: 1.2em;
  margin-right: 0.25rem;
  color: #b8860b;
}

.golden-ratio-value {
  font-size: 0.9em;
  color: #666;
}

/* 黄金比例网格叠加（调试用） */
.pdfViewer.debug-golden-ratio::before {
  content: '';
  position: absolute;
  top: 0;
  left: calc(var(--golden-width));
  width: 1px;
  height: 100%;
  background: rgba(255, 215, 0, 0.5);
  z-index: 1000;
  pointer-events: none;
}
```

### 7. 使用示例

```javascript
// 启用黄金比例缩放
const pdfViewer = new PDFViewer({
  container: document.getElementById('viewer'),
  enableGoldenRatioScaling: true,
  goldenRatioMode: GoldenRatioModes.PRIMARY,
  adaptiveGoldenRatio: true,
  defaultGoldenScaleMode: GoldenRatioScaleModes.GOLDEN_FIT
});

// 设置黄金比例缩放模式
pdfViewer.currentScaleValue = GoldenRatioScaleModes.GOLDEN_AUTO;

// 获取特定页面的黄金比例缩放值
const page3GoldenScale = pdfViewer.getPageScale(3);

// 为特定页面设置自定义黄金比例模式
pdfViewer.setPageScaleMode(5, GoldenRatioScaleModes.GOLDEN_READING);
```

### 8. 高级应用场景

#### A. 艺术作品和设计文档
```javascript
class ArtworkOptimizer {
  optimizeForArtwork(pdfViewer) {
    // 为艺术作品优化：使用严格的黄金比例
    for (let i = 1; i <= pdfViewer.pagesCount; i++) {
      const pageView = pdfViewer.getPageView(i - 1);
      
      if (this.isArtworkPage(pageView)) {
        // 艺术页面使用黄金宽度模式
        pdfViewer.setPageScaleMode(i, GoldenRatioScaleModes.GOLDEN_WIDTH);
      } else {
        // 文字页面使用黄金阅读模式
        pdfViewer.setPageScaleMode(i, GoldenRatioScaleModes.GOLDEN_READING);
      }
    }
  }
}
```

#### B. 自适应阅读体验
```javascript
class GoldenReadingExperience {
  enhanceReading(pdfViewer) {
    // 根据时间和用户习惯调整黄金比例
    const timeOfDay = new Date().getHours();
    let goldenMode;
    
    if (timeOfDay >= 6 && timeOfDay <= 10) {
      goldenMode = GoldenRatioModes.READING; // 晨读模式
    } else if (timeOfDay >= 14 && timeOfDay <= 18) {
      goldenMode = GoldenRatioModes.BALANCED; // 下午平衡模式
    } else {
      goldenMode = GoldenRatioModes.PRIMARY; // 其他时间标准模式
    }
    
    pdfViewer.pageScaleManager.setGoldenRatioMode(goldenMode);
  }
}
```

## 总结

基于黄金比例的缩放设计将为PDF.js带来：

1. **美学优化**：符合黄金比例的视觉美学，提供更舒适的阅读体验
2. **智能适配**：根据页面特性自动选择最佳的黄金比例模式
3. **个性化体验**：支持多种黄金比例模式，满足不同用户需求
4. **科学依据**：基于认知科学和视觉设计原理，提供最优的信息展示方式

这种设计特别适用于：
- 艺术作品和设计文档的展示
- 学术论文和技术文档的阅读
- 电子书和长篇文档的舒适阅读
- 移动设备上的PDF浏览体验优化