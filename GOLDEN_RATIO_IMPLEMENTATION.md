# PDF.js 黄金比例宽度功能实现

## 概述

在现有PDF.js架构基础上实现了黄金比例宽度功能，让每页宽度设置为可视宽度的黄金比例，同时用户控制的缩放比例在黄金宽度的基础上进行缩放。

## 黄金比例常量

**黄金比例** φ ≈ 1.618033988749  
**黄金比例倒数** 1/φ ≈ 0.618033988749

## 实现细节

### 1. 常量定义 (web/ui_utils.js)

```javascript
const GOLDEN_RATIO = 1.618033988749;
const GOLDEN_RATIO_INVERSE = 1 / GOLDEN_RATIO; // ≈ 0.618
```

### 2. 核心方法 (web/pdf_viewer.js)

#### #getGoldenRatioBaseScale()
计算黄金比例基础缩放值的私有方法：

```javascript
#getGoldenRatioBaseScale() {
  const currentPage = this._pages[this._currentPageNumber - 1];
  if (!currentPage) {
    return 1;
  }
  
  let hPadding = SCROLLBAR_PADDING;
  
  if (this.isInPresentationMode) {
    hPadding = 4; // 2 * 2px
    if (this._spreadMode !== SpreadMode.NONE) {
      hPadding *= 2;
    }
  } else if (
    (typeof PDFJSDev === "undefined" || PDFJSDev.test("GENERIC")) &&
    this.removePageBorders
  ) {
    hPadding = 0;
  } else if (this._scrollMode === ScrollMode.HORIZONTAL) {
    hPadding = VERTICAL_PADDING;
  }
  
  const goldenContainerWidth = (this.container.clientWidth - hPadding) * GOLDEN_RATIO_INVERSE;
  return ((goldenContainerWidth / currentPage.width) * currentPage.scale) / this.#pageWidthScaleFactor;
}
```

#### #setScale() 方法修改

1. **新增"golden-width"缩放模式**：
```javascript
case "golden-width":
  // Calculate scale to make page width equal to golden ratio of container width
  scale = this.#getGoldenRatioBaseScale();
  break;
```

2. **数值缩放基于黄金比例**：
```javascript
if (scale > 0) {
  // Scale user input relative to golden ratio base scale
  const goldenBaseScale = this.#getGoldenRatioBaseScale();
  scale = goldenBaseScale * scale;
  options.preset = false;
  this.#setScaleUpdatePages(scale, value, options);
} else {
  // ... 预设缩放模式处理
}
```

## 功能特性

### 1. 黄金比例宽度模式
- 使用 `pdfViewer.currentScaleValue = "golden-width"` 设置
- 页面宽度自动调整为容器宽度的黄金比例倒数（≈61.8%）
- 保持页面比例，不会产生变形

### 2. 基于黄金比例的数值缩放
- 用户输入的数值缩放（如1.0, 1.5, 2.0等）现在基于黄金比例宽度
- `scale = 1.0` → 页面宽度 = 容器宽度 × 0.618
- `scale = 1.5` → 页面宽度 = 容器宽度 × 0.618 × 1.5 = 容器宽度 × 0.927
- `scale = 2.0` → 页面宽度 = 容器宽度 × 0.618 × 2.0 = 容器宽度 × 1.236

### 3. 兼容性
- 完全兼容现有的缩放模式（"page-width", "page-height", "page-fit", "auto"等）
- 不影响现有功能，只是增加了新的缩放选项
- 支持所有页面布局模式（单页、双页、水平滚动等）

## 使用示例

```javascript
// 设置黄金比例宽度
pdfViewer.currentScaleValue = "golden-width";

// 基于黄金比例的数值缩放
pdfViewer.currentScaleValue = 1.0;  // 61.8% 容器宽度
pdfViewer.currentScaleValue = 1.5;  // 92.7% 容器宽度
pdfViewer.currentScaleValue = 0.8;  // 49.4% 容器宽度

// 传统缩放模式仍然可用
pdfViewer.currentScaleValue = "page-width";
pdfViewer.currentScaleValue = "page-fit";
```

## 文件修改清单

1. **web/ui_utils.js**
   - 添加黄金比例常量
   - 导出新常量

2. **web/pdf_viewer.js**
   - 导入黄金比例常量
   - 添加 `#getGoldenRatioBaseScale()` 方法
   - 修改 `#setScale()` 方法支持黄金比例
   - 新增 "golden-width" 缩放模式

3. **test_golden_ratio.html** (测试文件)
   - 提供功能演示和测试界面

## 数学原理

黄金比例在视觉设计中被认为是最和谐的比例。通过将页面宽度设置为容器宽度的黄金比例倒数：

- 页面宽度 = 容器宽度 × (1/φ)
- 页面宽度 = 容器宽度 × 0.618
- 留白宽度 = 容器宽度 × (1 - 1/φ) = 容器宽度 × 0.382

这样的布局可以提供更好的视觉体验和阅读舒适度。

## 测试

使用提供的 `test_golden_ratio.html` 文件可以：
- 测试黄金比例宽度模式
- 验证数值缩放基于黄金比例的功能
- 观察不同缩放值的效果
- 对比传统缩放模式

## 注意事项

1. 该功能保持了PDF.js的原有架构，没有破坏现有功能
2. 黄金比例计算考虑了不同的显示模式（演示模式、边框等）
3. 缩放计算基于当前页面的尺寸和容器大小
4. 支持响应式布局，容器大小变化时自动重新计算