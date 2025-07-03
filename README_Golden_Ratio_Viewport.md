# 🌟 PDF.js 黄金分割比例 Viewport

一个为PDF.js打造的智能viewport管理器，提供基于黄金分割比例(φ ≈ 0.618)的美学阅读体验。

## ✨ 特性

- 🎯 **黄金分割比例**: 页面宽度自动适配为可视区域的61.8%
- 🔄 **兼容现有缩放**: 完美集成PDF.js原有的缩放系统
- 📱 **响应式设计**: 自动适应窗口大小变化
- 💾 **状态持久化**: 设置自动保存到本地存储
- ⚡ **性能优化**: 防抖处理，避免频繁重计算
- 🎨 **自定义比例**: 支持0.3-0.8之间的任意比例
- 🖱️ **滚动保持**: 缩放时智能保持页面中心位置

## 🚀 快速开始

### 基本使用

```javascript
// 1. 创建黄金分割比例管理器
const goldenManager = new GoldenRatioViewportManager(pdfViewer);

// 2. 启用黄金分割比例视图
goldenManager.enable();

// 3. 设置自定义比例
goldenManager.setRatio(0.6); // 60%宽度

// 4. 禁用并恢复标准模式
goldenManager.disable();
```

### 完整集成（推荐）

```javascript
// 1. 初始化扩展系统
const extension = new PDFViewerGoldenRatioExtension(pdfViewer);

// 2. 创建工具栏界面
const toolbar = new GoldenRatioToolbar(pdfViewer);

// 3. 通过缩放值直接设置
pdfViewer.currentScaleValue = 'golden-ratio';
```

## 📚 API 文档

### GoldenRatioViewportManager

主要的管理器类，提供核心功能。

#### 构造函数

```javascript
new GoldenRatioViewportManager(pdfViewer, options)
```

**参数:**
- `pdfViewer` - PDF.js查看器实例
- `options` - 配置选项对象

**配置选项:**
```javascript
{
  ratio: 0.618,           // 黄金分割比例
  minScale: 0.1,          // 最小缩放比例
  maxScale: 10.0,         // 最大缩放比例
  enableResize: true,     // 启用窗口变化监听
  preserveCenter: true,   // 缩放时保持中心位置
  debounceDelay: 150,     // 防抖延迟(毫秒)
  saveToStorage: true     // 保存到本地存储
}
```

#### 主要方法

| 方法 | 说明 | 示例 |
|------|------|------|
| `enable()` | 启用黄金分割比例视图 | `manager.enable()` |
| `disable()` | 禁用并恢复标准模式 | `manager.disable()` |
| `toggle()` | 切换启用/禁用状态 | `manager.toggle()` |
| `setRatio(ratio)` | 设置自定义比例(0-1) | `manager.setRatio(0.6)` |
| `getRatio()` | 获取当前比例 | `const ratio = manager.getRatio()` |
| `resetScale()` | 重置缩放倍数为1.0 | `manager.resetScale()` |
| `getStatus()` | 获取当前状态信息 | `const status = manager.getStatus()` |

#### 事件

```javascript
// 监听状态变化
pdfViewer.eventBus._on('goldenratioviewportchanged', (evt) => {
  console.log('状态:', evt.enabled);
  console.log('比例:', evt.ratio);
});
```

### PDFViewerGoldenRatioExtension

扩展PDF.js缩放系统，添加 `'golden-ratio'` 缩放模式。

```javascript
const extension = new PDFViewerGoldenRatioExtension(pdfViewer);

// 现在可以使用新的缩放模式
pdfViewer.currentScaleValue = 'golden-ratio';

// 获取管理器实例
const manager = extension.getGoldenRatioManager();
```

### GoldenRatioToolbar

提供用户界面组件，可快速集成到现有应用中。

```javascript
const toolbar = new GoldenRatioToolbar(pdfViewer, 'customContainerId');
```

## 🎯 使用场景

### 1. 学术论文阅读

```javascript
// 为学术阅读优化的配置
const manager = new GoldenRatioViewportManager(pdfViewer, {
  ratio: GOLDEN_RATIO,     // 使用黄金分割比例
  preserveCenter: true,    // 保持阅读位置
  saveToStorage: true      // 记住设置
});

manager.enable();
```

### 2. 响应式网页应用

```javascript
// 响应式配置
const manager = new GoldenRatioViewportManager(pdfViewer, {
  enableResize: true,      // 自动适应窗口变化
  debounceDelay: 200,      // 适当的防抖延迟
  ratio: 0.65              // 略大于黄金比例
});

// 监听屏幕方向变化
window.addEventListener('orientationchange', () => {
  if (manager.isActive) {
    setTimeout(() => manager.calculateAndApply(), 300);
  }
});
```

### 3. 自定义阅读器

```javascript
// 带有预设比例的阅读器
const ratioPresets = {
  compact: 0.5,      // 紧凑模式
  golden: 0.618,     // 黄金比例
  comfortable: 0.75  // 舒适模式
};

function setReadingMode(mode) {
  const ratio = ratioPresets[mode];
  manager.setRatio(ratio);
  manager.enable();
}
```

## 🔧 兼容性说明

### 与原有缩放系统的兼容

黄金分割比例viewport与PDF.js原有缩放功能完全兼容：

```javascript
// ✅ 这些操作都会正常工作
pdfViewer.currentScale = 1.5;           // 数值缩放
pdfViewer.currentScaleValue = 'auto';   // 自适应模式
pdfViewer.currentScaleValue = 'page-fit'; // 适合页面

// ✅ 放大缩小操作
pdfViewer.increaseScale();  // 放大10%
pdfViewer.decreaseScale();  // 缩小10%

// ✅ 新增的黄金分割模式
pdfViewer.currentScaleValue = 'golden-ratio';
```

### 缩放倍数系统

在黄金分割模式下，系统维护两个缩放值：

- **基准缩放** (`baseScale`): 满足黄金分割比例的基础缩放
- **缩放倍数** (`currentMultiplier`): 在基准基础上的放大倍数

```javascript
// 获取详细状态
const status = manager.getStatus();
console.log({
  baseScale: status.baseScale,        // 1.2 (基准)
  multiplier: status.currentMultiplier, // 1.5 (倍数)
  finalScale: status.finalScale       // 1.8 (最终)
});

// 手动更新缩放倍数
manager.updateScale(1.1); // 放大10%
```

## 🎨 界面集成

### HTML 结构

```html
<!-- 在工具栏中添加控件 -->
<div class="pdf-toolbar">
  <div id="goldenRatioToolbar"></div>
</div>

<!-- PDF查看器容器 -->
<div id="viewerContainer"></div>
```

### CSS 样式

```css
/* 黄金分割比例工具栏样式 */
.golden-ratio-toolbar {
  padding: 10px;
  background: #f9f9f9;
  border-radius: 4px;
  margin: 10px 0;
}

.golden-ratio-controls label {
  font-weight: bold;
  margin-bottom: 8px;
}

.ratio-controls {
  margin-left: 20px;
  padding: 10px;
  background: white;
  border-radius: 4px;
}
```

## ⚡ 性能优化

### 防抖处理

```javascript
// 自定义防抖延迟
const manager = new GoldenRatioViewportManager(pdfViewer, {
  debounceDelay: 300  // 300ms防抖
});

// 手动设置防抖
manager.handleResize = manager.debounce(
  manager.handleResize.bind(manager), 
  500
);
```

### 内存管理

```javascript
// 组件卸载时清理资源
function cleanup() {
  toolbar.destroy();      // 清理UI组件
  extension.destroy();    // 恢复原始方法
  manager.destroy();      // 移除事件监听
}

// 页面卸载时执行清理
window.addEventListener('beforeunload', cleanup);
```

## 🌍 浏览器支持

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+
- ⚠️ IE 不支持

## 📱 移动端适配

```javascript
// 移动端优化配置
const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);

const manager = new GoldenRatioViewportManager(pdfViewer, {
  ratio: isMobile ? 0.9 : 0.618,    // 移动端使用更大比例
  enableResize: isMobile,           // 移动端启用方向监听
  debounceDelay: isMobile ? 300 : 150
});
```

## 🔍 调试模式

```javascript
// 开启调试模式
const manager = new GoldenRatioViewportManager(pdfViewer, {
  debug: true  // 在控制台输出调试信息
});

// 手动获取状态信息
console.log('Golden Ratio Status:', manager.getStatus());
```

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -am 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- PDF.js 团队提供的优秀PDF渲染库
- 黄金分割比例在设计中的美学价值
- 开源社区的支持和贡献

---

**Made with ❤️ for better PDF reading experience**