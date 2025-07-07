# PDF.js 标注编辑时原始标注从Canvas移除的机制详解

PDF.js采用了一个巧妙的多层架构来处理标注的编辑模式，通过**条件性渲染控制**而非直接移除的方式实现原始标注的"隐藏"。

## 🎯 核心机制概述

**PDF.js并不是直接从canvas中"移除"标注，而是通过以下机制控制标注的渲染：**

1. **双层渲染架构**：标注同时存在于Canvas层和DOM层
2. **条件性渲染控制**：根据编辑状态决定是否渲染到canvas
3. **DOM层隐藏**：同时隐藏DOM层的标注元素
4. **编辑器接管**：用编辑器替代原始标注的显示

## 📋 详细处理流程

### 1. 编辑模式触发

当用户激活编辑模式时，`isEditing` 标志被设置：

```javascript
// src/display/api.js:2421
if (isEditing) {
  renderingIntent += RenderingIntentFlag.IS_EDITING;
}
```

### 2. 渲染意图传递

渲染意图通过以下路径传递到Worker线程：

```
PDFViewer → PDFPageProxy.render() → WorkerTransport.getRenderingIntent() → Worker线程
```

### 3. Worker端的条件性渲染判断

在Worker端，`isEditing` 标志被解析并用于判断标注是否应该被渲染：

```javascript
// src/core/document.js:578
const isEditing = !!(intent & RenderingIntentFlag.IS_EDITING);

// src/core/document.js:587-593
if (
  intentAny ||
  (intentDisplay &&
    annotation.mustBeViewed(annotationStorage, renderForms) &&
    annotation.mustBeViewedWhenEditing(isEditing, modifiedIds)) ||
  (intentPrint && annotation.mustBePrinted(annotationStorage))
) {
  // 只有满足条件的标注才会被加入到渲染列表
  opListPromises.push(annotation.getOperatorList(...));
}
```

### 4. 关键判断方法：`mustBeViewedWhenEditing`

这是控制标注在编辑模式下是否渲染的核心方法：

#### 基础实现（大多数标注类型）
```javascript
// src/core/annotation.js:847
mustBeViewedWhenEditing(isEditing, modifiedIds = null) {
  return isEditing ? !this.data.isEditable : !modifiedIds?.has(this.data.id);
}
```

**逻辑解析**：
- **编辑模式下**：只有 `!isEditable` 的标注才会被渲染（即不可编辑的标注继续显示）
- **非编辑模式下**：只有未被修改的标注才会被渲染

#### 特殊实现（StampAnnotation）
```javascript
// src/core/annotation.js:4956-4973
mustBeViewedWhenEditing(isEditing, modifiedIds = null) {
  if (isEditing) {
    if (!this.data.isEditable) {
      return true; // 不可编辑的印章继续显示
    }
    // 可编辑的印章：强制使用canvas渲染以供编辑器使用
    this.#savedHasOwnCanvas ??= this.data.hasOwnCanvas;
    this.data.hasOwnCanvas = true;
    return true;
  }
  // 退出编辑模式时恢复原始设置
  if (this.#savedHasOwnCanvas !== null) {
    this.data.hasOwnCanvas = this.#savedHasOwnCanvas;
    this.#savedHasOwnCanvas = null;
  }
  return !modifiedIds?.has(this.data.id);
}
```

### 5. 渲染操作列表的构建

只有通过 `mustBeViewedWhenEditing` 检查的标注才会：
1. 调用 `annotation.getOperatorList()` 生成渲染指令
2. 被加入到页面的操作列表中
3. 最终在canvas上被绘制

### 6. DOM层的标注元素处理

与此同时，在DOM层面，原始标注元素被隐藏：

```javascript
// src/display/editor/annotation_editor_layer.js:267
for (const editable of editables) {
  editable.hide(); // 隐藏DOM中的标注元素
  // ...
}
```

```javascript
// src/display/annotation_layer.js:690
hide() {
  if (this.container) {
    this.container.hidden = true; // 设置DOM元素为隐藏
  }
  this.popup?.forceHide();
}
```

## 🔄 分离渲染机制

PDF.js还使用了 `separateAnnots` 机制来优化渲染：

```javascript
// src/display/api.js:3072-3080
get separateAnnots() {
  const { separateAnnots } = this.#internalRenderTask.operatorList;
  if (!separateAnnots) {
    return false;
  }
  const { annotationCanvasMap } = this.#internalRenderTask;
  return (
    separateAnnots.form ||
    (separateAnnots.canvas && annotationCanvasMap?.size > 0)
  );
}
```

这个机制允许某些标注（如表单字段）在独立的canvas上渲染，便于后续的编辑处理。

## 🎭 双重状态管理

### Canvas层状态
- **编辑模式**：可编辑标注不被渲染到canvas
- **正常模式**：所有标注正常渲染

### DOM层状态
- **编辑模式**：原始标注元素被隐藏（`hidden = true`）
- **正常模式**：标注元素正常显示

### 编辑器层状态
- **编辑模式**：编辑器接管标注的显示和交互
- **正常模式**：编辑器隐藏或移除

## 📊 渲染决策流程图

```
用户激活编辑模式
    ↓
设置 isEditing = true
    ↓
页面重新渲染
    ↓
Worker 解析 isEditing 标志
    ↓
遍历所有标注
    ↓
调用 mustBeViewedWhenEditing(isEditing, modifiedIds)
    ↓
判断结果：
├── 返回 true → 标注被渲染到canvas
└── 返回 false → 标注不被渲染（从canvas"移除"）
    ↓
DOM层：原始标注元素被隐藏
    ↓
编辑器层：创建对应的编辑器
```

## 🔧 关键优势

1. **性能优化**：避免了复杂的canvas操作，只需控制渲染流程
2. **状态一致性**：通过统一的判断逻辑确保渲染状态正确
3. **可逆性**：退出编辑模式时可以完美恢复原始状态
4. **类型特化**：不同标注类型可以有特定的编辑行为
5. **内存效率**：原始标注数据始终保持，无需重新解析

## 🎯 总结

PDF.js的标注"移除"机制实际上是一个**智能的条件性渲染系统**：

- **核心原理**：通过 `mustBeViewedWhenEditing()` 方法控制标注是否被包含在渲染操作列表中
- **实现方式**：在Worker端的渲染准备阶段进行过滤，而非在已有canvas上进行删除操作
- **双重保障**：同时在Canvas层（条件性渲染）和DOM层（元素隐藏）确保原始标注不可见
- **编辑器接管**：用专门的编辑器组件替代原始标注的显示和交互功能

这种设计既保证了编辑体验的流畅性，又保持了系统架构的清晰性和高性能。