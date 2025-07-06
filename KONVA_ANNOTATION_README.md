# PDF.js Konva 标注功能

这是一个基于 PDF.js 和 Konva 的强大标注系统，为 PDF 查看器添加了交互式标注功能。

## 功能特性

### 🎯 支持的标注类型
- **框选工具**: 创建矩形框选区域，适用于标记重要段落或区域
- **下划线**: 为文本添加下划线标注，用于强调重要内容
- **删除线**: 为文本添加删除线标注，表示需要删除或修改的内容
- **高亮标注**: 为文本或区域添加半透明的彩色背景
- **自由绘制**: 手绘任意形状的标注，提供最大的灵活性

### ✨ 核心功能
- 🖱️ 实时预览和交互式编辑
- 📱 响应式设计，支持移动设备
- ⌨️ 完整的键盘快捷键支持
- 💾 导出和导入标注数据（JSON 格式）
- 🖼️ 导出标注为图片
- 🎨 可自定义的样式和配置
- 📋 标注面板，方便管理所有标注
- 🔄 完整的事件系统和回调支持

## 文件结构

```
web/
├── konva_annotation_layer_builder.js    # 标注层构建器（核心）
├── konva_annotation_layer_builder.css   # 标注样式文件
├── konva_annotation_toolbar.js          # 标注工具栏组件
├── konva_annotation_panel.js            # 标注面板组件
├── konva_annotation_demo.html           # 功能演示页面
└── pdf_page_view.js                     # 已修改，集成标注层
```

## 安装和配置

### 1. 安装依赖

```bash
npm install konva
```

### 2. 引入文件

在你的 HTML 文件中引入样式文件：

```html
<link rel="stylesheet" href="konva_annotation_layer_builder.css">
```

在你的 JavaScript 模块中引入必要的组件：

```javascript
import { KonvaAnnotationLayerBuilder, AnnotationTool } from './konva_annotation_layer_builder.js';
import { KonvaAnnotationToolbar } from './konva_annotation_toolbar.js';
import { KonvaAnnotationPanel } from './konva_annotation_panel.js';
```

## 快速开始

### 基本使用

```javascript
// 创建事件总线
const eventBus = new EventBus();

// 创建标注层
const annotationLayer = new KonvaAnnotationLayerBuilder({
  pdfPage: pdfPage,
  viewport: viewport,
  eventBus: eventBus,
  onAnnotationCreated: (annotation) => {
    console.log('标注已创建:', annotation);
  },
  onAnnotationUpdated: (annotation) => {
    console.log('标注已更新:', annotation);
  },
  onAnnotationDeleted: (annotation) => {
    console.log('标注已删除:', annotation);
  }
});

// 渲染标注层
await annotationLayer.render();

// 添加到 PDF 页面
pageElement.appendChild(annotationLayer.div);

// 设置当前工具
annotationLayer.setCurrentTool(AnnotationTool.RECTANGLE);
```

### 添加工具栏

```javascript
const toolbar = new KonvaAnnotationToolbar({
  container: toolbarContainer,
  eventBus: eventBus,
  onToolChanged: (tool) => {
    annotationLayer.setCurrentTool(tool);
  }
});

// 启用工具栏
toolbar.enable();
```

### 添加标注面板

```javascript
const panel = new KonvaAnnotationPanel({
  container: panelContainer,
  eventBus: eventBus,
  onAnnotationSelect: (annotation) => {
    // 处理标注选择
  },
  onAnnotationDelete: (annotation) => {
    // 处理标注删除
  }
});
```

## API 参考

### KonvaAnnotationLayerBuilder

#### 构造函数选项

```javascript
{
  pdfPage: PDFPageProxy,              // PDF 页面对象
  viewport: PageViewport,             // 页面视口
  eventBus: EventBus,                 // 事件总线
  onAnnotationCreated: Function,      // 标注创建回调
  onAnnotationUpdated: Function,      // 标注更新回调
  onAnnotationDeleted: Function       // 标注删除回调
}
```

#### 主要方法

```javascript
// 渲染标注层
await annotationLayer.render();

// 设置当前工具
annotationLayer.setCurrentTool(AnnotationTool.RECTANGLE);

// 获取当前工具
const currentTool = annotationLayer.getCurrentTool();

// 获取所有标注
const annotations = annotationLayer.getAnnotations();

// 清除所有标注
annotationLayer.clearAnnotations();

// 导出标注数据
const data = annotationLayer.exportAnnotations();

// 导入标注数据
annotationLayer.importAnnotations(annotationsData);

// 更新视口
annotationLayer.updateViewport(newViewport);

// 显示/隐藏层
annotationLayer.show();
annotationLayer.hide();

// 销毁层
annotationLayer.destroy();
```

### AnnotationTool 枚举

```javascript
const AnnotationTool = {
  NONE: "none",                    // 无工具
  SELECT: "select",                // 选择工具
  RECTANGLE: "rectangle",          // 框选工具
  UNDERLINE: "underline",          // 下划线工具
  STRIKETHROUGH: "strikethrough",  // 删除线工具
  HIGHLIGHT: "highlight",          // 高亮工具
  FREEHAND: "freehand"            // 自由绘制工具
};
```

### KonvaAnnotationToolbar

#### 主要方法

```javascript
// 启用/禁用工具栏
toolbar.enable();
toolbar.disable();

// 显示/隐藏工具栏
toolbar.show();
toolbar.hide();

// 设置当前工具
toolbar.setCurrentTool(AnnotationTool.RECTANGLE);

// 获取当前工具
const tool = toolbar.getCurrentTool();

// 更新按钮状态
toolbar.updateButtonStates(annotationCount);

// 销毁工具栏
toolbar.destroy();
```

### KonvaAnnotationPanel

#### 主要方法

```javascript
// 显示/隐藏面板
panel.show();
panel.hide();
panel.toggle();

// 设置标注列表
panel.setAnnotations(annotations);

// 添加标注
panel.addAnnotation(annotation);

// 删除标注
panel.removeAnnotation(annotation);

// 更新标注
panel.updateAnnotation(annotation);

// 清除所有标注
panel.clearAnnotations();

// 获取标注数量
const count = panel.getAnnotationCount();

// 销毁面板
panel.destroy();
```

## 事件系统

### 标注相关事件

```javascript
// 工具改变
eventBus._on('konvaannotationtoolchanged', (data) => {
  console.log('工具已改变:', data.tool);
});

// 标注创建
eventBus._on('konvaannotationcreated', (data) => {
  console.log('标注已创建:', data.annotation);
});

// 标注更新
eventBus._on('konvaannotationupdated', (data) => {
  console.log('标注已更新:', data.annotation);
});

// 标注删除
eventBus._on('konvaannotationdeleted', (data) => {
  console.log('标注已删除:', data.annotation);
});

// 标注选择
eventBus._on('konvaannotationselect', (data) => {
  console.log('标注已选择:', data.annotation);
});

// 面板切换
eventBus._on('konvaannotationpaneltoggle', () => {
  console.log('面板切换');
});

// 清除所有标注
eventBus._on('konvaannotationclearall', () => {
  console.log('清除所有标注');
});

// 导出标注
eventBus._on('konvaannotationexport', () => {
  console.log('导出标注');
});

// 导入标注
eventBus._on('konvaannotationimport', (data) => {
  console.log('导入标注:', data.annotations);
});
```

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Escape` | 取消当前工具 |
| `Ctrl+S` | 选择工具 |
| `Ctrl+R` | 框选工具 |
| `Ctrl+U` | 下划线工具 |
| `Ctrl+D` | 删除线工具 |
| `Ctrl+H` | 高亮工具 |
| `Ctrl+F` | 自由绘制工具 |
| `Ctrl+Delete` | 清除所有标注 |

## 样式自定义

### 修改标注样式

你可以通过修改 `ANNOTATION_STYLES` 对象来自定义标注的外观：

```javascript
const ANNOTATION_STYLES = {
  rectangle: {
    stroke: "#ff0000",      // 边框颜色
    strokeWidth: 2,         // 边框宽度
    fill: "transparent",    // 填充颜色
    dash: [5, 5]           // 虚线样式
  },
  underline: {
    stroke: "#0000ff",      // 线条颜色
    strokeWidth: 2,         // 线条宽度
    lineCap: "round"        // 线条端点样式
  },
  // ... 其他样式
};
```

### 修改 CSS 样式

你可以通过修改 `konva_annotation_layer_builder.css` 文件来自定义工具栏和面板的外观。

## 数据格式

### 标注数据格式

```javascript
{
  id: "annotation_123",           // 唯一标识符
  type: "rectangle",              // 标注类型
  startPos: { x: 100, y: 100 },  // 起始位置
  endPos: { x: 200, y: 150 },    // 结束位置
  rect: {                         // 矩形数据（仅矩形和高亮）
    x: 100,
    y: 100,
    width: 100,
    height: 50
  },
  line: {                         // 线条数据（仅下划线和删除线）
    points: [100, 100, 200, 100]
  },
  path: {                         // 路径数据（仅自由绘制）
    points: [100, 100, 150, 120, 200, 100]
  },
  timestamp: 1640995200000,       // 创建时间戳
  pageNumber: 1                   // 页面编号
}
```

### 导出数据格式

```javascript
{
  version: "1.0",                 // 版本号
  timestamp: 1640995200000,       // 导出时间戳
  annotations: [                  // 标注数组
    // ... 标注数据
  ]
}
```

## 与 PDF.js 集成

标注功能已经完全集成到 PDF.js 的架构中。在 `pdf_page_view.js` 中，Konva 标注层被添加到了层级管理系统中，确保与其他层（文本层、注释层等）的正确协调。

### 层级顺序

```javascript
const LAYERS_ORDER = new Map([
  ["canvasWrapper", 0],
  ["textLayer", 1],
  ["annotationLayer", 2],
  ["annotationEditorLayer", 3],
  ["konvaAnnotationLayer", 4],  // 新增的 Konva 标注层
  ["xfaLayer", 3],
]);
```

## 演示页面

访问 `konva_annotation_demo.html` 查看完整的功能演示。该页面展示了：

- 所有标注工具的使用
- 标注面板的功能
- 导出和导入功能
- 键盘快捷键
- 响应式设计

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## 常见问题

### Q: 如何自定义标注颜色？
A: 修改 `konva_annotation_layer_builder.js` 中的 `ANNOTATION_STYLES` 对象。

### Q: 如何禁用某些标注工具？
A: 在创建工具栏时，移除不需要的工具按钮创建代码。

### Q: 如何保存标注到服务器？
A: 使用 `exportAnnotations()` 方法获取标注数据，然后发送到服务器。

### Q: 标注数据如何持久化？
A: 你可以将导出的 JSON 数据保存到数据库，页面加载时使用 `importAnnotations()` 方法恢复。

### Q: 如何处理多页文档？
A: 每个页面都应该创建独立的 `KonvaAnnotationLayerBuilder` 实例，使用页面编号来管理不同页面的标注。

## 许可证

本项目基于 Apache 2.0 许可证。

## 贡献

欢迎提交 Issue 和 Pull Request 来改进这个标注系统。

---

更多信息请参考源代码注释和演示页面。