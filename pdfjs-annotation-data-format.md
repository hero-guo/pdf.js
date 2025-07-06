# PDF.js 标注数据格式详解

## 概述

PDF.js 中的标注（Annotation）数据格式是一个复杂且结构化的系统，用于表示PDF文档中的各种标注类型。本文档详细介绍了PDF.js中标注数据的结构和格式。

## 核心数据结构

### 1. 基础标注对象 (Annotation)

PDF.js 中的所有标注都基于 `Annotation` 基类，包含以下核心属性：

```javascript
{
  id: string,                    // 标注唯一标识符
  annotationType: number,        // 标注类型（来自 AnnotationType 枚举）
  subtype: string,              // PDF 规范中的子类型
  rect: [number, number, number, number], // 标注矩形边界 [x1, y1, x2, y2]
  color: [number, number, number] | null,  // RGB 颜色值
  borderStyle: {                // 边框样式
    width: number,
    style: number,
    dashArray: number[],
    horizontalCornerRadius: number,
    verticalCornerRadius: number
  },
  flags: number,                // 标注标志位
  modificationDate: string,     // 修改日期
  title: string,               // 标题
  contents: string,            // 内容
  alternativeText: string,     // 替代文本
  noRotate: boolean,           // 是否不旋转
  hasPopup: boolean,           // 是否有弹出窗口
  popupRef: Ref,               // 弹出窗口引用
  hasAppearance: boolean,      // 是否有外观
  viewable: boolean,           // 是否可见
  printable: boolean,          // 是否可打印
  rotation: number,            // 旋转角度
  quadPoints: number[]         // 四边形点集合（用于高亮等）
}
```

### 2. 标注类型 (AnnotationType)

PDF.js 支持多种标注类型，每种类型对应不同的数据结构：

```javascript
const AnnotationType = {
  TEXT: 1,          // 文本标注
  LINK: 2,          // 链接标注
  FREETEXT: 3,      // 自由文本标注
  LINE: 4,          // 线条标注
  SQUARE: 5,        // 矩形标注
  CIRCLE: 6,        // 圆形标注
  POLYGON: 7,       // 多边形标注
  POLYLINE: 8,      // 多线条标注
  HIGHLIGHT: 9,     // 高亮标注
  UNDERLINE: 10,    // 下划线标注
  SQUIGGLY: 11,     // 波浪线标注
  STRIKEOUT: 12,    // 删除线标注
  STAMP: 13,        // 印章标注
  CARET: 14,        // 插入符标注
  INK: 15,          // 墨迹标注
  POPUP: 16,        // 弹出窗口标注
  FILEATTACHMENT: 17, // 文件附件标注
  WIDGET: 18        // 表单控件标注
};
```

## 特定标注类型的数据格式

### 1. 文本标注 (Text Annotation)

```javascript
{
  ...baseAnnotation,
  annotationType: AnnotationType.TEXT,
  iconName: string,            // 图标名称 (Note, Comment, Key, Help, etc.)
  state: string,               // 状态
  stateModel: string,          // 状态模型
  creationDate: string,        // 创建日期
  inReplyTo: string,          // 回复的标注ID
  replyType: string           // 回复类型
}
```

### 2. 链接标注 (Link Annotation)

```javascript
{
  ...baseAnnotation,
  annotationType: AnnotationType.LINK,
  url: string,                // 链接URL
  dest: any,                  // 目标位置
  action: {                   // 动作对象
    type: string,
    url: string,
    dest: any
  },
  newWindow: boolean,         // 是否在新窗口打开
  quadPoints: number[]        // 链接区域的四边形点
}
```

### 3. 自由文本标注 (FreeText Annotation)

```javascript
{
  ...baseAnnotation,
  annotationType: AnnotationType.FREETEXT,
  textContent: string[],      // 文本内容数组
  hasTextContent: boolean,    // 是否有文本内容
  defaultAppearance: {        // 默认外观
    fontSize: number,
    fontName: string,
    fontColor: [number, number, number]
  },
  textAlignment: number,      // 文本对齐方式 (0=左, 1=居中, 2=右)
  calloutLine: number[],      // 引出线坐标
  intent: string,             // 意图 (FreeText, FreeTextCallout, FreeTextTypeWriter)
  lineEnding: string[]        // 线条结束样式
}
```

### 4. 高亮标注 (Highlight Annotation)

```javascript
{
  ...baseAnnotation,
  annotationType: AnnotationType.HIGHLIGHT,
  quadPoints: number[],       // 高亮区域的四边形点集合
  overlaysTextContent: boolean, // 是否覆盖文本内容
  color: [number, number, number], // 高亮颜色
  opacity: number             // 透明度
}
```

### 5. 墨迹标注 (Ink Annotation)

```javascript
{
  ...baseAnnotation,
  annotationType: AnnotationType.INK,
  inkLists: number[][][],     // 墨迹路径数组，每个路径包含多个点
  borderStyle: {
    width: number,
    style: number
  }
}
```

### 6. 印章标注 (Stamp Annotation)

```javascript
{
  ...baseAnnotation,
  annotationType: AnnotationType.STAMP,
  name: string,               // 印章名称
  iconName: string,           // 图标名称
  appearance: {               // 外观数据
    normal: any,
    rollover: any,
    down: any
  },
  bitmapId: string,          // 位图ID
  bitmap: ImageBitmap        // 位图数据
}
```

### 7. 表单控件标注 (Widget Annotation)

```javascript
{
  ...baseAnnotation,
  annotationType: AnnotationType.WIDGET,
  fieldType: string,          // 字段类型 (Tx, Btn, Ch, Sig)
  fieldName: string,          // 字段名称
  fieldValue: any,            // 字段值
  defaultFieldValue: any,     // 默认字段值
  alternativeText: string,    // 替代文本
  mappingName: string,        // 映射名称
  fieldFlags: number,         // 字段标志位
  
  // 文本字段特有属性
  textContent: string[],      // 文本内容
  maxLen: number,             // 最大长度
  multiLine: boolean,         // 是否多行
  password: boolean,          // 是否密码字段
  comb: boolean,              // 是否梳状字段
  
  // 按钮字段特有属性
  checkBox: boolean,          // 是否复选框
  radioButton: boolean,       // 是否单选按钮
  pushButton: boolean,        // 是否按钮
  
  // 选择字段特有属性
  options: Array<{            // 选项数组
    exportValue: string,
    displayValue: string
  }>,
  combo: boolean,             // 是否组合框
  multiSelect: boolean,       // 是否多选
  
  // 签名字段特有属性
  signature: any              // 签名数据
}
```

## 标注存储格式

### 1. AnnotationStorage 存储结构

```javascript
{
  // 标注ID -> 标注数据映射
  [annotationId: string]: {
    value: any,                // 标注值
    formattedValue: string,    // 格式化后的值
    selRange: [number, number], // 选择范围
    charLimit: number,         // 字符限制
    backgroundColor: [number, number, number], // 背景色
    borderColor: [number, number, number],     // 边框色
    color: [number, number, number],           // 前景色
    rotation: number,          // 旋转角度
    hidden: boolean,           // 是否隐藏
    print: boolean,            // 是否打印
    noPrint: boolean,          // 是否不打印
    noView: boolean,           // 是否不显示
    readOnly: boolean,         // 是否只读
    required: boolean,         // 是否必填
    noRotate: boolean,         // 是否不旋转
    multiLine: boolean,        // 是否多行
    password: boolean,         // 是否密码
    multipleSelection: boolean, // 是否多选
    remove: boolean,           // 是否删除
    userName: string,          // 用户名
    rect: [number, number, number, number], // 矩形区域
    popupContent: string       // 弹出窗口内容
  }
}
```

### 2. 序列化格式

```javascript
{
  map: Map<string, any>,      // 标注数据映射
  hash: string,               // 数据哈希值
  transfer: ArrayBuffer[]     // 传输数据（如位图）
}
```

## 标注编辑器数据格式

### 1. 编辑器基础数据

```javascript
{
  annotationType: AnnotationEditorType, // 编辑器类型
  pageIndex: number,          // 页面索引
  id: string,                // 编辑器ID
  deleted: boolean,          // 是否已删除
  rect: [number, number, number, number], // 矩形边界
  rotation: number,          // 旋转角度
  color: string,             // 颜色
  thickness: number,         // 粗细
  opacity: number,           // 透明度
  paths: {                   // 路径数据
    bezier: number[][],
    points: number[][]
  },
  bitmapId: string,          // 位图ID
  bitmap: ImageBitmap,       // 位图数据
  accessibilityData: {       // 可访问性数据
    type: string,
    text: string
  }
}
```

### 2. 自由文本编辑器

```javascript
{
  ...baseEditor,
  annotationType: AnnotationEditorType.FREETEXT,
  value: string,             // 文本值
  fontSize: number,          // 字体大小
  fontColor: [number, number, number] // 字体颜色
}
```

### 3. 高亮编辑器

```javascript
{
  ...baseEditor,
  annotationType: AnnotationEditorType.HIGHLIGHT,
  quadPoints: number[][],    // 四边形点集合
  outlines: {                // 轮廓数据
    points: number[][],
    bezier: number[][]
  },
  boxes: {                   // 边界框数据
    points: number[][],
    bezier: number[][]
  }
}
```

### 4. 墨迹编辑器

```javascript
{
  ...baseEditor,
  annotationType: AnnotationEditorType.INK,
  paths: {                   // 路径数据
    points: number[][][],    // 点集合
    bezier: number[][][]     // 贝塞尔曲线
  },
  thickness: number,         // 线条粗细
  opacity: number           // 透明度
}
```

### 5. 印章编辑器

```javascript
{
  ...baseEditor,
  annotationType: AnnotationEditorType.STAMP,
  bitmapId: string,          // 位图ID
  bitmap: ImageBitmap,       // 位图数据
  isSvg: boolean,            // 是否SVG
  accessibilityData: {       // 可访问性数据
    type: "Figure",
    text: string
  }
}
```

## 事件和回调数据格式

### 1. 标注事件数据

```javascript
{
  source: any,               // 事件源
  type: string,              // 事件类型
  name: string,              // 事件名称
  value: any,                // 事件值
  change: string,            // 变化描述
  changeEx: any,             // 扩展变化数据
  willCommit: boolean,       // 是否提交
  commitKey: number,         // 提交键
  keyDown: boolean,          // 是否按键
  modifier: number,          // 修饰符
  shift: boolean,            // 是否按下Shift
  rc: boolean,               // 返回代码
  selStart: number,          // 选择开始
  selEnd: number             // 选择结束
}
```

### 2. 字段对象数据

```javascript
{
  id: string,                // 字段ID
  value: any,                // 字段值
  defaultValue: any,         // 默认值
  exportValue: any,          // 导出值
  editable: boolean,         // 是否可编辑
  name: string,              // 字段名称
  rect: [number, number, number, number], // 矩形区域
  hidden: boolean,           // 是否隐藏
  print: boolean,            // 是否打印
  display: number,           // 显示模式
  textSize: number,          // 文本大小
  textColor: [number, number, number], // 文本颜色
  borderStyle: string,       // 边框样式
  backgroundColor: [number, number, number], // 背景色
  rotation: number,          // 旋转角度
  charLimit: number,         // 字符限制
  multiline: boolean,        // 是否多行
  password: boolean,         // 是否密码
  fileSelect: boolean,       // 是否文件选择
  multipleSelection: boolean, // 是否多选
  options: Array<{           // 选项
    exportValue: string,
    displayValue: string
  }>,
  siblings: any[],           // 同级元素
  actions: {                 // 动作
    keystroke: Function,
    format: Function,
    validate: Function,
    calculate: Function
  }
}
```

## 总结

PDF.js 的标注数据格式是一个多层次、类型化的系统，支持丰富的标注类型和属性。核心特点包括：

1. **类型化结构**：每种标注类型都有特定的数据结构
2. **存储分离**：原始数据和编辑数据分别存储
3. **序列化支持**：支持数据的序列化和反序列化
4. **事件驱动**：通过事件系统处理标注的交互
5. **扩展性**：可以通过编辑器系统添加新的标注类型

这种设计使得PDF.js能够有效地处理各种复杂的PDF标注场景，同时保持良好的性能和用户体验。