# PDF.js 每页单独缩放设计方案

## 当前架构分析

### 现有缩放机制

当前PDF.js使用统一缩放策略：

1. **基于当前页面计算**：以 `_currentPageNumber` 对应的页面为基准
2. **统一应用**：计算出的缩放值应用到所有页面
3. **一致性保证**：所有页面使用相同的缩放值

```javascript
// 当前实现：基于单一页面计算
const currentPage = this._pages[this._currentPageNumber - 1];
const pageWidthScale = (((this.container.clientWidth - hPadding) / currentPage.width) * currentPage.scale) / this.#pageWidthScaleFactor;

// 应用到所有页面
this.#setScaleUpdatePages(scale, value, options);
```

### 关键组件

1. **PDFViewer.#setScale()** - 缩放计算入口
2. **PDFViewer.#setScaleUpdatePages()** - 统一应用缩放
3. **PDFViewer.refresh()** - 更新所有页面
4. **PDFPageView.update()** - 单页更新

## 新架构设计：每页单独缩放

### 1. 核心概念变更

#### 从统一缩放到独立缩放

| 概念 | 当前实现 | 新设计 |
|------|----------|--------|
| 缩放基准 | 当前页面 | 每页独立 |
| 缩放值 | 全局统一 | 每页专属 |
| 计算时机 | 缩放模式变更时 | 实时计算/缓存 |
| UI状态 | 单一缩放值显示 | 主要页面缩放值 |

#### 新的数据结构

```javascript
class PDFViewer {
  // 新增：每页缩放管理器
  #pageScaleManager = null;
  
  // 新增：当前缩放模式
  #currentScaleMode = 'page-fit'; // 'page-width', 'page-height', 'page-fit', 'auto', number
  
  // 保留：用于UI显示的主要缩放值（当前页面的缩放值）
  _currentScale = 1;
  _currentScaleValue = '100%';
}

class PageScaleManager {
  #pageScales = new Map(); // pageNumber -> scale
  #scaleMode = 'page-fit';
  #viewer = null;
  
  constructor(viewer) {
    this.#viewer = viewer;
  }
  
  // 计算指定页面的缩放值
  calculatePageScale(pageNumber, mode = this.#scaleMode) {
    const pageView = this.#viewer._pages[pageNumber - 1];
    if (!pageView) return 1;
    
    return this.#calculateScaleForPage(pageView, mode);
  }
  
  // 获取页面缩放值（带缓存）
  getPageScale(pageNumber) {
    if (!this.#pageScales.has(pageNumber)) {
      const scale = this.calculatePageScale(pageNumber);
      this.#pageScales.set(pageNumber, scale);
    }
    return this.#pageScales.get(pageNumber);
  }
  
  // 清空缓存并重新计算
  invalidateCache() {
    this.#pageScales.clear();
  }
  
  // 设置缩放模式
  setScaleMode(mode) {
    if (this.#scaleMode !== mode) {
      this.#scaleMode = mode;
      this.invalidateCache();
    }
  }
}
```

### 2. 核心实现方案

#### A. 修改缩放计算逻辑

```javascript
class PDFViewer {
  constructor(options) {
    // ... 现有代码 ...
    this.#pageScaleManager = new PageScaleManager(this);
  }

  // 重写：支持每页单独缩放
  #setScale(value, options) {
    if (typeof value === 'number' && value > 0) {
      // 数值缩放：所有页面使用相同缩放
      options.preset = false;
      this.#setUniformScale(value, options);
    } else {
      // 自适应缩放：每页单独计算
      options.preset = true;
      this.#setAdaptiveScale(value, options);
    }
  }

  // 新增：统一缩放（数值模式）
  #setUniformScale(scale, options) {
    this.#pageScaleManager.setScaleMode('uniform');
    this.#pageScaleManager.setUniformScale(scale);
    this.#applyScaleToAllPages(options);
  }

  // 新增：自适应缩放（每页单独）
  #setAdaptiveScale(mode, options) {
    this.#pageScaleManager.setScaleMode(mode);
    this.#applyAdaptiveScaling(options);
  }

  // 新增：应用自适应缩放
  #applyAdaptiveScaling(options) {
    const visiblePages = this._getVisiblePages();
    
    // 更新当前缩放值（用于UI显示）
    if (visiblePages.views.length > 0) {
      const currentPageNumber = this._currentPageNumber;
      this._currentScale = this.#pageScaleManager.getPageScale(currentPageNumber);
      this._currentScaleValue = this.#pageScaleManager.getScaleMode();
    }

    // 应用到所有页面
    this.#refreshWithIndividualScaling(options);
  }

  // 新增：使用独立缩放刷新页面
  #refreshWithIndividualScaling(options = {}) {
    const { noScroll = false, drawingDelay = -1 } = options;
    
    // 为每个页面设置其专属缩放
    for (let i = 0; i < this._pages.length; i++) {
      const pageView = this._pages[i];
      const pageScale = this.#pageScaleManager.getPageScale(i + 1);
      
      pageView.update({
        scale: pageScale,
        drawingDelay: drawingDelay
      });
    }

    // 更新容器样式（使用主要缩放值）
    this.viewer.style.setProperty(
      "--scale-factor",
      this._currentScale * PixelsPerInch.PDF_TO_CSS_UNITS
    );

    if (!noScroll) {
      this.#adjustScrollPositionForScaling();
    }

    this.eventBus.dispatch("scalechanging", {
      source: this,
      scale: this._currentScale,
      presetValue: this._currentScaleValue,
    });

    if (this.defaultRenderingQueue) {
      this.update();
    }
  }
}
```

#### B. PageScaleManager详细实现

```javascript
class PageScaleManager {
  #calculateScaleForPage(pageView, mode) {
    const container = this.#viewer.container;
    let hPadding = SCROLLBAR_PADDING;
    let vPadding = VERTICAL_PADDING;

    // 应用当前显示模式的填充
    this.#applyPaddingForMode(hPadding, vPadding);

    const pageWidthScale = (((container.clientWidth - hPadding) / pageView.width) * pageView.scale) / this.#getPageWidthScaleFactor();
    const pageHeightScale = ((container.clientHeight - vPadding) / pageView.height) * pageView.scale;

    switch (mode) {
      case "page-actual":
        return 1;
      case "page-width":
        return pageWidthScale;
      case "page-height":
        return pageHeightScale;
      case "page-fit":
        return Math.min(pageWidthScale, pageHeightScale);
      case "auto":
        const horizontalScale = isPortraitOrientation(pageView)
          ? pageWidthScale
          : Math.min(pageHeightScale, pageWidthScale);
        return Math.min(MAX_AUTO_SCALE, horizontalScale);
      case "uniform":
        return this.#uniformScale || 1;
      default:
        if (typeof mode === 'number' && mode > 0) {
          return mode;
        }
        return 1;
    }
  }

  // 获取页面专属的宽度缩放因子
  #getPageWidthScaleFactor() {
    const viewer = this.#viewer;
    if (viewer._spreadMode !== SpreadMode.NONE && 
        viewer._scrollMode !== ScrollMode.HORIZONTAL) {
      return 2;
    }
    return 1;
  }

  // 设置统一缩放值（数值模式）
  setUniformScale(scale) {
    this.#uniformScale = scale;
    this.#scaleMode = 'uniform';
    this.invalidateCache();
  }
}
```

### 3. UI/UX 适配

#### A. 缩放控件更新

```javascript
// 缩放控件需要显示"主要"缩放值
class ScaleControl {
  updateDisplay() {
    const viewer = this.pdfViewer;
    const currentScale = viewer.currentScale;
    const scaleMode = viewer.currentScaleValue;
    
    if (typeof scaleMode === 'string') {
      // 自适应模式：显示模式名称
      this.scaleSelect.value = scaleMode;
      this.scaleInput.value = `${Math.round(currentScale * 100)}%`;
    } else {
      // 数值模式：显示具体数值
      this.scaleSelect.value = 'custom';
      this.scaleInput.value = `${Math.round(currentScale * 100)}%`;
    }
  }
}
```

#### B. 滚动和导航调整

```javascript
class PDFViewer {
  // 修改：滚动位置调整
  #adjustScrollPositionForScaling() {
    // 在每页独立缩放模式下，需要重新计算滚动位置
    // 因为页面高度可能发生变化
    
    const currentPageView = this._pages[this._currentPageNumber - 1];
    if (currentPageView) {
      // 保持当前页面在视窗中心
      this.#scrollIntoView(currentPageView);
    }
  }

  // 修改：页面导航
  scrollPageIntoView({pageNumber, destArray = null, allowNegativeOffset = false, ignoreDestinationZoom = false}) {
    // ... 现有逻辑 ...
    
    if (!ignoreDestinationZoom && destArray) {
      // 在每页独立缩放模式下，只影响目标页面的缩放
      const targetPageScale = this.#calculateDestinationScale(destArray, pageNumber);
      if (targetPageScale) {
        this.#pageScaleManager.setPageScale(pageNumber, targetPageScale);
        this.#refreshSinglePage(pageNumber);
      }
    }
    
    // ... 其余逻辑 ...
  }
}
```

### 4. 性能优化策略

#### A. 缓存机制

```javascript
class PageScaleManager {
  // 智能缓存：只缓存可见页面的缩放值
  #optimizedCaching() {
    const visiblePages = this.#viewer._getVisiblePages();
    const visiblePageNumbers = new Set(visiblePages.views.map(v => v.id));
    
    // 清理不可见页面的缓存
    for (const [pageNumber] of this.#pageScales) {
      if (!visiblePageNumbers.has(pageNumber)) {
        this.#pageScales.delete(pageNumber);
      }
    }
  }

  // 预计算：为即将可见的页面预计算缩放值
  precomputeScales(pageNumbers) {
    for (const pageNumber of pageNumbers) {
      if (!this.#pageScales.has(pageNumber)) {
        const scale = this.calculatePageScale(pageNumber);
        this.#pageScales.set(pageNumber, scale);
      }
    }
  }
}
```

#### B. 增量更新

```javascript
class PDFViewer {
  // 只更新需要更新的页面
  #refreshVisiblePages(options = {}) {
    const visiblePages = this._getVisiblePages();
    const pagesToUpdate = [];

    for (const {view} of visiblePages.views) {
      const newScale = this.#pageScaleManager.getPageScale(view.id);
      if (Math.abs(view.scale - newScale) > 1e-10) {
        pagesToUpdate.push({view, newScale});
      }
    }

    // 批量更新
    for (const {view, newScale} of pagesToUpdate) {
      view.update({
        scale: newScale,
        drawingDelay: options.drawingDelay || -1
      });
    }
  }
}
```

### 5. 实际应用场景

#### A. 混合尺寸文档优化

```javascript
// 示例：A4和A3页面混合的文档
class MixedSizeDocumentHandler {
  optimizeForMixedSizes() {
    const viewer = this.pdfViewer;
    
    // 分析页面尺寸分布
    const pageSizes = this.analyzePageSizes();
    
    // 为不同尺寸的页面设置不同的自适应策略
    for (const [pageNumber, sizeCategory] of pageSizes) {
      let scaleMode;
      switch (sizeCategory) {
        case 'landscape':
          scaleMode = 'page-width'; // 横向页面优先适配宽度
          break;
        case 'portrait':
          scaleMode = 'page-fit';   // 竖向页面适配整页
          break;
        case 'square':
          scaleMode = 'page-fit';   // 方形页面适配整页
          break;
      }
      
      viewer.pageScaleManager.setPageScaleMode(pageNumber, scaleMode);
    }
  }
}
```

#### B. 阅读模式优化

```javascript
class ReadingModeOptimizer {
  // 智能阅读模式：根据内容密度调整缩放
  optimizeForReading() {
    const viewer = this.pdfViewer;
    
    for (let i = 1; i <= viewer.pagesCount; i++) {
      const contentDensity = this.analyzeContentDensity(i);
      const optimalScale = this.calculateOptimalReadingScale(i, contentDensity);
      
      viewer.pageScaleManager.setPageScale(i, optimalScale);
    }
  }
  
  calculateOptimalReadingScale(pageNumber, contentDensity) {
    const baseScale = this.viewer.pageScaleManager.calculatePageScale(pageNumber, 'page-width');
    
    // 根据内容密度调整
    if (contentDensity > 0.8) {
      return baseScale * 1.2; // 高密度内容放大
    } else if (contentDensity < 0.3) {
      return baseScale * 0.9; // 低密度内容缩小
    }
    
    return baseScale;
  }
}
```

### 6. 兼容性考虑

#### A. API向后兼容

```javascript
class PDFViewer {
  // 保持现有API兼容
  get currentScale() {
    // 返回当前页面的缩放值
    return this.#pageScaleManager.getPageScale(this._currentPageNumber);
  }

  set currentScale(scale) {
    if (typeof scale === 'number') {
      // 数值模式：设置统一缩放
      this.#setScale(scale, {});
    }
  }

  get currentScaleValue() {
    return this._currentScaleValue;
  }

  set currentScaleValue(value) {
    this.#setScale(value, {});
  }

  // 新增：每页独立缩放API
  getPageScale(pageNumber) {
    return this.#pageScaleManager.getPageScale(pageNumber);
  }

  setPageScale(pageNumber, scale) {
    this.#pageScaleManager.setPageScale(pageNumber, scale);
    this.#refreshSinglePage(pageNumber);
  }

  setPageScaleMode(pageNumber, mode) {
    this.#pageScaleManager.setPageScaleMode(pageNumber, mode);
    this.#refreshSinglePage(pageNumber);
  }
}
```

#### B. 渐进式迁移

```javascript
class PDFViewer {
  constructor(options) {
    // ... 现有代码 ...
    
    // 通过选项控制是否启用每页独立缩放
    this.#enablePerPageScaling = options.enablePerPageScaling ?? false;
    
    if (this.#enablePerPageScaling) {
      this.#pageScaleManager = new PageScaleManager(this);
    }
  }

  #setScale(value, options) {
    if (this.#enablePerPageScaling) {
      this.#setScaleWithPerPageSupport(value, options);
    } else {
      this.#setScaleLegacy(value, options); // 原有实现
    }
  }
}
```

### 7. 实施计划

#### 阶段1：核心架构（2-3周）
- [ ] 实现 `PageScaleManager` 类
- [ ] 修改 `PDFViewer.#setScale` 方法
- [ ] 添加基础的每页缩放支持

#### 阶段2：UI适配（1-2周）
- [ ] 更新缩放控件
- [ ] 调整滚动和导航逻辑
- [ ] 实现缩放状态显示

#### 阶段3：性能优化（1-2周）
- [ ] 实现智能缓存
- [ ] 添加增量更新
- [ ] 优化渲染性能

#### 阶段4：高级功能（2-3周）
- [ ] 混合尺寸文档优化
- [ ] 阅读模式智能调整
- [ ] 自定义缩放策略API

#### 阶段5：测试和兼容性（1-2周）
- [ ] 全面测试
- [ ] 向后兼容性验证
- [ ] 性能基准测试

### 8. 潜在挑战和解决方案

#### 挑战1：性能影响
- **问题**：每页单独计算和缓存可能影响性能
- **解决方案**：
  - 智能缓存策略
  - 懒加载计算
  - 增量更新机制

#### 挑战2：UI复杂度
- **问题**：用户界面需要显示和控制多个缩放值
- **解决方案**：
  - 显示"主要"缩放值（当前页面）
  - 提供页面级缩放控制选项
  - 智能默认行为

#### 挑战3：滚动体验
- **问题**：页面尺寸不一致可能影响滚动体验
- **解决方案**：
  - 智能滚动定位
  - 平滑过渡动画
  - 可选的统一高度模式

#### 挑战4：兼容性
- **问题**：现有代码和插件可能依赖统一缩放
- **解决方案**：
  - 保持API向后兼容
  - 提供渐进式迁移选项
  - 详细的迁移指南

## 总结

每页单独缩放的设计将显著提升PDF.js在处理混合尺寸文档时的用户体验，特别适用于：

1. **技术文档**：包含不同尺寸的图表和表格
2. **设计稿集合**：混合横向和纵向页面
3. **扫描文档**：页面尺寸不一致的历史文档
4. **演示文稿**：不同页面有不同的最佳显示比例

通过合理的架构设计和渐进式实施，可以在保持现有功能和性能的基础上，为用户提供更加智能和个性化的PDF阅读体验。