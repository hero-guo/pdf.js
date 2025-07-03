# PDF.js 缩放规则详解

## 缩放常量定义

PDF.js 在 `web/ui_utils.js` 中定义了以下缩放相关的常量：

```javascript
const DEFAULT_SCALE_VALUE = "auto";     // 默认缩放值："auto"
const DEFAULT_SCALE = 1.0;              // 默认缩放比例：100%
const DEFAULT_SCALE_DELTA = 1.1;        // 缩放步长：每次缩放变化10%
const MIN_SCALE = 0.1;                  // 最小缩放：10%
const MAX_SCALE = 10.0;                 // 最大缩放：1000%
const UNKNOWN_SCALE = 0;                // 未知缩放标识
const MAX_AUTO_SCALE = 1.25;            // 自动缩放最大值：125%
```

## 缩放模式

### 1. 数值型缩放
- 直接设置具体的缩放比例（如 0.5, 1.0, 1.5 等）
- 范围限制在 `MIN_SCALE`（0.1）到 `MAX_SCALE`（10.0）之间

### 2. 预设缩放模式

#### `"page-actual"`
- 实际大小，缩放比例为 1.0（100%）

#### `"page-width"`
- 适合页面宽度
- 计算公式：`((容器宽度 - 水平填充) / 页面宽度) * 页面比例 / 页面宽度缩放因子`

#### `"page-height"`
- 适合页面高度  
- 计算公式：`(容器高度 - 垂直填充) / 页面高度 * 页面比例`

#### `"page-fit"`
- 适合页面大小（整页可见）
- 取宽度缩放和高度缩放中的较小值：`Math.min(pageWidthScale, pageHeightScale)`

#### `"auto"`
- 自动缩放模式
- 对于竖版页面（portrait）：使用页面宽度缩放
- 对于横版页面（landscape）：取页面高度缩放和页面宽度缩放中的较小值
- 最终缩放值限制在 `MAX_AUTO_SCALE`（1.25）以下

## 缩放操作

### 增大缩放（Zoom In）
- 使用 `DEFAULT_SCALE_DELTA`（1.1）作为倍数
- 新缩放值 = 当前缩放值 × 1.1
- 受 `MAX_SCALE` 限制

### 减小缩放（Zoom Out）
- 使用 `DEFAULT_SCALE_DELTA`（1.1）作为除数
- 新缩放值 = 当前缩放值 ÷ 1.1
- 受 `MIN_SCALE` 限制

### 缩放步进
- 支持指定步数进行缩放
- 正步数：放大，负步数：缩小

## 填充计算规则

### 普通模式
- 水平填充：`SCROLLBAR_PADDING = 40`
- 垂直填充：`VERTICAL_PADDING = 5`

### 演示模式（Presentation Mode）
- 页面有 2px 透明边框
- 水平和垂直填充都设为 4 (2 * 2px)
- 如果是双页模式，水平填充加倍

### 无边框模式
- 如果设置了 `removePageBorders`，填充为 0

### 水平滚动模式
- 交换水平和垂直填充值

## 双页模式影响

当处于双页模式（`SpreadMode.NONE` 以外）且不是水平滚动时：
- 页面宽度缩放因子为 2
- 这会影响 `page-width` 和 `auto` 模式的计算

## 缩放精度处理

- 为避免数值精度问题导致不必要的重新渲染，使用 `#isSameScale` 方法
- 当新旧缩放值差异小于 `1e-15` 时，视为相同缩放

## 事件系统

缩放变化时会触发 `scalechanging` 事件，包含：
- `source`: 事件源
- `scale`: 新的缩放值
- `presetValue`: 预设值（如果是预设模式）

## PDF 目标缩放支持

支持 PDF 内部目标的缩放类型：
- `XYZ`: 指定坐标和缩放
- `Fit/FitB`: 适合页面（转换为 "page-fit"）
- `FitH/FitBH`: 适合宽度（转换为 "page-width"）
- `FitV/FitBV`: 适合高度（转换为 "page-height"）
- `FitR`: 适合矩形区域（动态计算缩放值）

这套缩放规则确保了 PDF.js 能够在各种设备和窗口大小下提供良好的查看体验。