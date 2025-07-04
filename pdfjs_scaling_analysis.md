# PDF.js 缩放计算分析

## 代码上下文

这段代码来自 PDF.js 的 `web/pdf_viewer.js` 文件中的 `#setScale` 方法，用于计算PDF页面在容器中的显示比例。

## 分析的代码片段

```javascript
const pageWidthScale =
    (((this.container.clientWidth - hPadding) / currentPage.width) * currentPage.scale) /
    this.#pageWidthScaleFactor;
const pageHeightScale = 
    ((this.container.clientHeight - vPadding) / currentPage.height) * currentPage.scale;
```

## 详细解释

### 1. pageWidthScale（页面宽度缩放）

这个计算公式确定页面在容器宽度方向上的最适合缩放比例：

```javascript
const pageWidthScale =
    (((this.container.clientWidth - hPadding) / currentPage.width) * currentPage.scale) /
    this.#pageWidthScaleFactor;
```

**分解计算过程：**

1. `this.container.clientWidth - hPadding`
   - 获取容器的可用宽度（减去水平填充）
   - `hPadding` 是水平方向的填充空间，包括滚动条和边框的空间

2. `(this.container.clientWidth - hPadding) / currentPage.width`
   - 计算容器可用宽度与页面原始宽度的比例
   - 这是基础的宽度适配比例

3. `* currentPage.scale`
   - 乘以当前页面的缩放值
   - `currentPage.scale` 是页面当前的缩放状态

4. `/ this.#pageWidthScaleFactor`
   - 除以页面宽度缩放因子
   - 这个因子根据显示模式调整（单页模式为1，双页模式为2）

### 2. pageHeightScale（页面高度缩放）

这个计算公式确定页面在容器高度方向上的最适合缩放比例：

```javascript
const pageHeightScale = 
    ((this.container.clientHeight - vPadding) / currentPage.height) * currentPage.scale;
```

**分解计算过程：**

1. `this.container.clientHeight - vPadding`
   - 获取容器的可用高度（减去垂直填充）
   - `vPadding` 是垂直方向的填充空间

2. `(this.container.clientHeight - vPadding) / currentPage.height`
   - 计算容器可用高度与页面原始高度的比例

3. `* currentPage.scale`
   - 乘以当前页面的缩放值

## 关键变量说明

### hPadding 和 vPadding

这些填充值根据不同的显示模式计算：

```javascript
let hPadding = SCROLLBAR_PADDING,
    vPadding = VERTICAL_PADDING;

if (this.isInPresentationMode) {
    // 演示模式：考虑2px透明边框
    hPadding = vPadding = 4; // 2 * 2px
    if (this._spreadMode !== SpreadMode.NONE) {
        hPadding *= 2; // 双页模式需要双倍宽度
    }
} else if (this.removePageBorders) {
    // 移除页面边框模式
    hPadding = vPadding = 0;
} else if (this._scrollMode === ScrollMode.HORIZONTAL) {
    // 水平滚动模式：交换填充值
    [hPadding, vPadding] = [vPadding, hPadding];
}
```

### #pageWidthScaleFactor

这是一个私有计算属性：

```javascript
get #pageWidthScaleFactor() {
    if (
        this._spreadMode !== SpreadMode.NONE &&
        this._scrollMode !== ScrollMode.HORIZONTAL
    ) {
        return 2; // 双页模式
    }
    return 1; // 单页模式
}
```

## 使用场景

这些缩放值用于不同的显示模式：

1. **page-width**：使用 `pageWidthScale`，页面宽度适配容器
2. **page-height**：使用 `pageHeightScale`，页面高度适配容器
3. **page-fit**：使用 `Math.min(pageWidthScale, pageHeightScale)`，确保整页可见
4. **auto**：智能选择，考虑页面方向和最大缩放限制

## 设计目的

这些计算的主要目的是：

1. **自适应显示**：根据容器大小自动调整PDF页面缩放
2. **保持比例**：维持PDF页面的原始宽高比
3. **优化体验**：在不同显示模式下提供最佳的阅读体验
4. **多模式支持**：处理单页、双页、演示等不同显示模式

## 为什么需要乘以 currentPage.scale？

这是最关键的问题！让我详细解释：

### 核心原因：currentPage.width 和 currentPage.height 已经是缩放后的尺寸

在 PDF.js 的实现中：

1. **currentPage.width 和 currentPage.height 的来源**：
   ```javascript
   get width() {
     return this.viewport.width;  // 来自 viewport
   }
   get height() {
     return this.viewport.height; // 来自 viewport
   }
   ```

2. **viewport 的创建过程**：
   ```javascript
   this.viewport = pdfPage.getViewport({
     scale: this.scale * PixelsPerInch.PDF_TO_CSS_UNITS,
     rotation: totalRotation,
   });
   ```

3. **关键理解**：
   - `currentPage.width` 和 `currentPage.height` 不是PDF的原始尺寸
   - 它们是经过 `this.scale` 缩放后的尺寸
   - `this.scale` 就是 `currentPage.scale`

### 计算逻辑分析

假设：
- PDF 原始宽度：100 点
- 当前缩放：1.5
- 容器宽度：300 像素

那么：
- `currentPage.width` = 100 × 1.5 = 150（已缩放的宽度）
- `currentPage.scale` = 1.5

如果我们要计算"适合宽度"的新缩放值：

**错误的计算**（不乘以 currentPage.scale）：
```javascript
newScale = 300 / 150 = 2.0
```
这意味着最终缩放是 2.0，但实际上我们想要的是：300 / 100 = 3.0

**正确的计算**（乘以 currentPage.scale）：
```javascript
newScale = (300 / 150) * 1.5 = 2.0 * 1.5 = 3.0
```

### 数学推导

设：
- `originalWidth` = PDF 原始宽度
- `currentScale` = 当前缩放值
- `containerWidth` = 容器宽度

则：
- `currentPage.width = originalWidth * currentScale`
- 我们想要的新缩放 = `containerWidth / originalWidth`

计算过程：
```javascript
newScale = containerWidth / originalWidth
         = containerWidth / (currentPage.width / currentScale)
         = (containerWidth / currentPage.width) * currentScale
```

这就是为什么公式中需要乘以 `currentPage.scale`！

### 总结

乘以 `currentPage.scale` 的原因是：
1. **补偿已缩放的尺寸**：currentPage.width/height 已经包含了当前缩放
2. **恢复原始比例**：通过乘以当前缩放值，我们实际上是在计算相对于原始尺寸的新缩放
3. **保证正确的最终缩放**：确保计算出的缩放值是相对于PDF原始尺寸的绝对缩放

这是一个巧妙的设计，避免了需要存储和传递PDF原始尺寸，而是通过数学变换直接从当前状态计算出正确的新缩放值。