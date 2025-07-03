# limitCanvas 功能说明

## 概述
`limitCanvas` 是 PDF.js 中 `OutputScale` 类的一个方法，用于限制 Canvas 的渲染尺寸，防止因为过大的 Canvas 尺寸导致内存不足或性能问题。

## 方法定义
```javascript
limitCanvas(width, height, maxPixels, maxDim, capAreaFactor = -1)
```

## 参数说明
- `width`: Canvas 的宽度
- `height`: Canvas 的高度  
- `maxPixels`: 最大像素数限制
- `maxDim`: 最大尺寸限制（宽度或高度的最大值）
- `capAreaFactor`: 区域限制因子，默认为 -1

## 功能原理

### 1. 计算缩放限制
方法通过三种方式来限制 Canvas 的大小：

- **面积限制**: 基于 `maxPixels` 计算最大面积缩放比例
  ```javascript
  maxAreaScale = Math.sqrt(maxPixels / (width * height))
  ```

- **宽度限制**: 基于 `maxDim` 计算宽度缩放比例
  ```javascript
  maxWidthScale = maxDim / width
  ```

- **高度限制**: 基于 `maxDim` 计算高度缩放比例
  ```javascript
  maxHeightScale = maxDim / height
  ```

### 2. 应用最严格的限制
取三种限制中最小的缩放值：
```javascript
const maxScale = Math.min(maxAreaScale, maxWidthScale, maxHeightScale)
```

### 3. 调整输出缩放
如果当前的缩放值（`this.sx` 或 `this.sy`）超过了计算出的最大缩放值，则调整为最大允许的缩放值：
```javascript
if (this.sx > maxScale || this.sy > maxScale) {
  this.sx = maxScale;
  this.sy = maxScale;
  return true; // 返回 true 表示缩放被限制了
}
return false; // 返回 false 表示缩放未被限制
```

## 使用场景

### 1. PDF 页面视图 (PDFPageView)
在 `web/pdf_page_view.js` 中，`limitCanvas` 用于计算页面渲染的缩放比例：

```javascript
this.#needsRestrictedScaling = outputScale.limitCanvas(
  width,
  height,
  this.maxCanvasPixels,
  this.maxCanvasDim,
  this.capCanvasAreaFactor
);
```

### 2. PDF 缩略图视图 (PDFThumbnailView)
在 `web/pdf_thumbnail_view.js` 中也使用了相同的机制来限制缩略图的渲染大小。

## 作用和意义

### 1. 内存保护
- 防止创建过大的 Canvas 导致浏览器内存不足
- 避免因为超大 PDF 页面导致的内存溢出

### 2. 性能优化
- 限制渲染的像素数量，保持良好的渲染性能
- 避免在高分辨率显示器上创建超大的 Canvas

### 3. 设备兼容性
- 确保在不同设备和浏览器上都能正常工作
- 考虑设备的实际像素密度和屏幕尺寸

### 4. 自适应渲染
- 根据设备能力自动调整渲染质量
- 在质量和性能之间找到平衡点

## 返回值
- `true`: 表示缩放被限制了，Canvas 尺寸被调整
- `false`: 表示缩放未被限制，Canvas 尺寸保持原样

## 相关配置
该方法通常与以下配置参数配合使用：
- `maxCanvasPixels`: 最大 Canvas 像素数
- `maxCanvasDim`: 最大 Canvas 尺寸  
- `capCanvasAreaFactor`: Canvas 区域限制因子

这些参数通过 PDF.js 的配置系统进行设置，允许开发者根据应用需求和目标设备调整渲染限制。