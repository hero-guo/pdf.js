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

## 总结

这两个缩放计算公式是PDF.js实现自适应页面显示的核心算法，它们考虑了：
- 容器尺寸限制
- 页面原始尺寸
- 当前缩放状态
- 显示模式（单页/双页）
- 各种填充和边框空间

通过这些精确的计算，PDF.js能够在各种屏幕尺寸和显示模式下提供良好的PDF阅读体验。