# PDF.js 标注相关的 JavaScript 文件

根据对 PDF.js 代码库的分析，以下是与标注（annotation）功能相关的主要 JavaScript 文件：

## 核心文件 (Core Files)

### 1. `src/core/annotation.js`
- **文件大小**: 151KB, 5199 行
- **作用**: 标注功能的核心实现，包含标注解析、渲染和交互逻辑
- **重要性**: ⭐⭐⭐⭐⭐ (最重要的标注核心文件)

## 显示层文件 (Display Layer Files)

### 2. `src/display/annotation_layer.js`
- **文件大小**: 98KB, 3416 行
- **作用**: 标注层的显示逻辑，负责在页面上渲染标注
- **重要性**: ⭐⭐⭐⭐⭐

### 3. `src/display/annotation_storage.js`
- **文件大小**: 7.8KB, 324 行
- **作用**: 标注数据的存储和管理
- **重要性**: ⭐⭐⭐⭐

## 标注编辑器文件 (Annotation Editor Files)

### 4. `src/display/editor/annotation_editor_layer.js`
- **文件大小**: 28KB, 1050 行
- **作用**: 标注编辑器层的管理
- **重要性**: ⭐⭐⭐⭐

### 5. `src/display/editor/editor.js`
- **文件大小**: 55KB, 2130 行
- **作用**: 标注编辑器的基础类和通用功能
- **重要性**: ⭐⭐⭐⭐

### 6. `src/display/editor/freetext.js`
- **文件大小**: 24KB, 892 行
- **作用**: 自由文本标注编辑器
- **重要性**: ⭐⭐⭐

### 7. `src/display/editor/highlight.js`
- **文件大小**: 27KB, 1046 行
- **作用**: 高亮标注编辑器
- **重要性**: ⭐⭐⭐

### 8. `src/display/editor/ink.js`
- **文件大小**: 6.9KB, 288 行
- **作用**: 墨迹/手绘标注编辑器
- **重要性**: ⭐⭐⭐

### 9. `src/display/editor/stamp.js`
- **文件大小**: 25KB, 933 行
- **作用**: 印章标注编辑器
- **重要性**: ⭐⭐⭐

### 10. `src/display/editor/signature.js`
- **文件大小**: 11KB, 438 行
- **作用**: 签名标注编辑器
- **重要性**: ⭐⭐⭐

### 11. `src/display/editor/draw.js`
- **文件大小**: 25KB, 995 行
- **作用**: 绘图标注编辑器
- **重要性**: ⭐⭐⭐

## Web 层文件 (Web Layer Files)

### 12. `web/annotation_layer_builder.js`
- **文件大小**: 11KB, 328 行
- **作用**: 标注层构建器，负责在页面中构建标注层
- **重要性**: ⭐⭐⭐⭐

### 13. `web/annotation_editor_layer_builder.js`
- **文件大小**: 4.8KB, 144 行
- **作用**: 标注编辑器层构建器
- **重要性**: ⭐⭐⭐

### 14. `web/annotation_editor_params.js`
- **文件大小**: 4.8KB, 146 行
- **作用**: 标注编辑器参数管理
- **重要性**: ⭐⭐⭐

## 辅助文件 (Supporting Files)

### 15. `src/display/editor/alt_text.js`
- **文件大小**: 8.8KB, 339 行
- **作用**: 替代文本处理 (与标注相关)
- **重要性**: ⭐⭐

### 16. `src/display/editor/color_picker.js`
- **文件大小**: 8.3KB, 308 行
- **作用**: 颜色选择器 (用于标注)
- **重要性**: ⭐⭐

### 17. `src/display/editor/toolbar.js`
- **文件大小**: 7.2KB, 282 行
- **作用**: 标注编辑器工具栏
- **重要性**: ⭐⭐

### 18. `src/display/editor/tools.js`
- **文件大小**: 64KB, 2559 行
- **作用**: 标注编辑器工具集
- **重要性**: ⭐⭐⭐

## 核心 API 文件中的标注相关代码

### 19. `src/display/api.js`
- **文件大小**: 99KB, 3282 行
- **作用**: 包含标注相关的 API 接口
- **重要性**: ⭐⭐⭐⭐

### 20. `web/pdf_viewer.js`
- **文件大小**: 75KB, 2501 行
- **作用**: PDF 查看器主文件，包含标注模式管理
- **重要性**: ⭐⭐⭐⭐

### 21. `web/toolbar.js`
- **文件大小**: 12KB, 392 行
- **作用**: 工具栏，包含标注编辑器模式切换
- **重要性**: ⭐⭐⭐

### 22. `web/app.js`
- **文件大小**: 92KB, 2686 行
- **作用**: 应用主文件，包含标注相关的应用逻辑
- **重要性**: ⭐⭐⭐⭐

## 标注类型和常量定义

### 23. `web/pdfjs.js`
- **文件大小**: 2.4KB, 123 行
- **作用**: 导出标注相关的类型和常量
- **重要性**: ⭐⭐⭐

## 测试文件

### 24. `test/unit/annotation_spec.js`
- **作用**: 标注功能的单元测试
- **重要性**: ⭐⭐

## 文件分类总结

1. **核心逻辑文件**: annotation.js, annotation_layer.js, annotation_storage.js
2. **编辑器文件**: editor/ 目录下的所有文件
3. **构建器文件**: annotation_layer_builder.js, annotation_editor_layer_builder.js
4. **用户界面文件**: toolbar.js, annotation_editor_params.js
5. **主应用文件**: app.js, pdf_viewer.js

这些文件共同构成了 PDF.js 的完整标注功能体系，从底层的标注解析到用户界面的交互都有涉及。