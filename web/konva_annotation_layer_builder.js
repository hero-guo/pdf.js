/* Copyright 2024 Custom Implementation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import Konva from "konva";

/**
 * 标注类型枚举
 */
export const AnnotationType = {
  RECTANGLE: "rectangle",
  UNDERLINE: "underline",
  STRIKETHROUGH: "strikethrough",
  HIGHLIGHT: "highlight",
  FREEHAND: "freehand"
};

/**
 * 标注工具枚举
 */
export const AnnotationTool = {
  NONE: "none",
  SELECT: "select",
  RECTANGLE: "rectangle",
  UNDERLINE: "underline",
  STRIKETHROUGH: "strikethrough",
  HIGHLIGHT: "highlight",
  FREEHAND: "freehand"
};

/**
 * 标注样式配置
 */
const ANNOTATION_STYLES = {
  [AnnotationType.RECTANGLE]: {
    stroke: "#ff0000",
    strokeWidth: 2,
    fill: "transparent",
    dash: [5, 5]
  },
  [AnnotationType.UNDERLINE]: {
    stroke: "#0000ff",
    strokeWidth: 2,
    lineCap: "round"
  },
  [AnnotationType.STRIKETHROUGH]: {
    stroke: "#ff0000",
    strokeWidth: 2,
    lineCap: "round"
  },
  [AnnotationType.HIGHLIGHT]: {
    fill: "#ffff00",
    opacity: 0.3
  },
  [AnnotationType.FREEHAND]: {
    stroke: "#00ff00",
    strokeWidth: 2,
    lineCap: "round",
    lineJoin: "round"
  }
};

/**
 * Konva标注层构建器
 */
class KonvaAnnotationLayerBuilder {
  #annotations = [];
  #currentTool = AnnotationTool.NONE;
  #isDrawing = false;
  #currentShape = null;
  #startPos = null;
  #eventAbortController = null;

  constructor(options = {}) {
    this.pdfPage = options.pdfPage;
    this.viewport = options.viewport;
    this.container = options.container;
    this.eventBus = options.eventBus;
    this.onAnnotationCreated = options.onAnnotationCreated;
    this.onAnnotationUpdated = options.onAnnotationUpdated;
    this.onAnnotationDeleted = options.onAnnotationDeleted;
    
    this.stage = null;
    this.layer = null;
    this.div = null;
    this._cancelled = false;
    this._rendered = false;
  }

  /**
   * 渲染标注层
   */
  async render() {
    if (this._cancelled || this._rendered) {
      return;
    }

    this._createContainer();
    this._initializeKonva();
    this._bindEvents();
    this._rendered = true;
  }

  /**
   * 创建容器
   */
  _createContainer() {
    this.div = document.createElement("div");
    this.div.className = "konvaAnnotationLayer";
    this.div.style.position = "absolute";
    this.div.style.top = "0";
    this.div.style.left = "0";
    this.div.style.width = "100%";
    this.div.style.height = "100%";
    this.div.style.pointerEvents = "none";
    this.div.style.zIndex = "4"; // 确保在其他层之上

    // 创建canvas容器
    this.canvasContainer = document.createElement("div");
    this.canvasContainer.style.width = "100%";
    this.canvasContainer.style.height = "100%";
    this.div.appendChild(this.canvasContainer);
  }

  /**
   * 初始化Konva
   */
  _initializeKonva() {
    const { width, height } = this.viewport;
    
    this.stage = new Konva.Stage({
      container: this.canvasContainer,
      width: width,
      height: height
    });

    this.layer = new Konva.Layer();
    this.stage.add(this.layer);

    // 创建变换组来处理PDF坐标系
    this.annotationGroup = new Konva.Group();
    this.layer.add(this.annotationGroup);
  }

  /**
   * 绑定事件
   */
  _bindEvents() {
    if (!this.#eventAbortController) {
      this.#eventAbortController = new AbortController();
    }

    // 鼠标事件
    this.stage.on("mousedown", this._onMouseDown.bind(this));
    this.stage.on("mousemove", this._onMouseMove.bind(this));
    this.stage.on("mouseup", this._onMouseUp.bind(this));

    // 触摸事件
    this.stage.on("touchstart", this._onTouchStart.bind(this));
    this.stage.on("touchmove", this._onTouchMove.bind(this));
    this.stage.on("touchend", this._onTouchEnd.bind(this));
  }

  /**
   * 设置当前工具
   */
  setCurrentTool(tool) {
    this.#currentTool = tool;
    this.div.style.pointerEvents = tool === AnnotationTool.NONE ? "none" : "auto";
  }

  /**
   * 获取当前工具
   */
  getCurrentTool() {
    return this.#currentTool;
  }

  /**
   * 鼠标按下事件
   */
  _onMouseDown(e) {
    if (this.#currentTool === AnnotationTool.NONE || this.#currentTool === AnnotationTool.SELECT) {
      return;
    }

    this.#isDrawing = true;
    const pos = this.stage.getPointerPosition();
    this.#startPos = pos;

    this._startDrawing(pos);
  }

  /**
   * 鼠标移动事件
   */
  _onMouseMove(e) {
    if (!this.#isDrawing || !this.#currentShape) {
      return;
    }

    const pos = this.stage.getPointerPosition();
    this._updateDrawing(pos);
  }

  /**
   * 鼠标松开事件
   */
  _onMouseUp(e) {
    if (!this.#isDrawing) {
      return;
    }

    this.#isDrawing = false;
    const pos = this.stage.getPointerPosition();
    this._finishDrawing(pos);
  }

  /**
   * 触摸开始事件
   */
  _onTouchStart(e) {
    e.evt.preventDefault();
    this._onMouseDown(e);
  }

  /**
   * 触摸移动事件
   */
  _onTouchMove(e) {
    e.evt.preventDefault();
    this._onMouseMove(e);
  }

  /**
   * 触摸结束事件
   */
  _onTouchEnd(e) {
    e.evt.preventDefault();
    this._onMouseUp(e);
  }

  /**
   * 开始绘制
   */
  _startDrawing(pos) {
    switch (this.#currentTool) {
      case AnnotationTool.RECTANGLE:
        this._startRectangle(pos);
        break;
      case AnnotationTool.UNDERLINE:
        this._startUnderline(pos);
        break;
      case AnnotationTool.STRIKETHROUGH:
        this._startStrikethrough(pos);
        break;
      case AnnotationTool.HIGHLIGHT:
        this._startHighlight(pos);
        break;
      case AnnotationTool.FREEHAND:
        this._startFreehand(pos);
        break;
    }
  }

  /**
   * 更新绘制
   */
  _updateDrawing(pos) {
    switch (this.#currentTool) {
      case AnnotationTool.RECTANGLE:
        this._updateRectangle(pos);
        break;
      case AnnotationTool.UNDERLINE:
      case AnnotationTool.STRIKETHROUGH:
        this._updateLine(pos);
        break;
      case AnnotationTool.HIGHLIGHT:
        this._updateHighlight(pos);
        break;
      case AnnotationTool.FREEHAND:
        this._updateFreehand(pos);
        break;
    }
  }

  /**
   * 完成绘制
   */
  _finishDrawing(pos) {
    if (!this.#currentShape) {
      return;
    }

    // 检查是否是有效的标注（避免意外点击）
    if (!this._isValidAnnotation(pos)) {
      this.#currentShape.destroy();
      this.#currentShape = null;
      this.layer.draw();
      return;
    }

    // 添加到标注数组
    const annotation = this._createAnnotationData(this.#currentShape, pos);
    this.#annotations.push(annotation);

    // 添加选择和删除功能
    this._addAnnotationInteraction(this.#currentShape, annotation);

    // 触发回调
    this.onAnnotationCreated?.(annotation);

    // 清理
    this.#currentShape = null;
    this.layer.draw();
  }

  /**
   * 开始绘制矩形
   */
  _startRectangle(pos) {
    this.#currentShape = new Konva.Rect({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      ...ANNOTATION_STYLES[AnnotationType.RECTANGLE]
    });
    this.annotationGroup.add(this.#currentShape);
    this.layer.draw();
  }

  /**
   * 更新矩形
   */
  _updateRectangle(pos) {
    const width = pos.x - this.#startPos.x;
    const height = pos.y - this.#startPos.y;
    
    this.#currentShape.setAttrs({
      width: Math.abs(width),
      height: Math.abs(height),
      x: width < 0 ? pos.x : this.#startPos.x,
      y: height < 0 ? pos.y : this.#startPos.y
    });
    this.layer.draw();
  }

  /**
   * 开始绘制下划线
   */
  _startUnderline(pos) {
    this.#currentShape = new Konva.Line({
      points: [pos.x, pos.y, pos.x, pos.y],
      ...ANNOTATION_STYLES[AnnotationType.UNDERLINE]
    });
    this.annotationGroup.add(this.#currentShape);
    this.layer.draw();
  }

  /**
   * 开始绘制删除线
   */
  _startStrikethrough(pos) {
    this.#currentShape = new Konva.Line({
      points: [pos.x, pos.y, pos.x, pos.y],
      ...ANNOTATION_STYLES[AnnotationType.STRIKETHROUGH]
    });
    this.annotationGroup.add(this.#currentShape);
    this.layer.draw();
  }

  /**
   * 更新线条
   */
  _updateLine(pos) {
    this.#currentShape.points([
      this.#startPos.x,
      this.#startPos.y,
      pos.x,
      pos.y
    ]);
    this.layer.draw();
  }

  /**
   * 开始绘制高亮
   */
  _startHighlight(pos) {
    this.#currentShape = new Konva.Rect({
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      ...ANNOTATION_STYLES[AnnotationType.HIGHLIGHT]
    });
    this.annotationGroup.add(this.#currentShape);
    this.layer.draw();
  }

  /**
   * 更新高亮
   */
  _updateHighlight(pos) {
    this._updateRectangle(pos);
  }

  /**
   * 开始绘制自由绘制
   */
  _startFreehand(pos) {
    this.#currentShape = new Konva.Line({
      points: [pos.x, pos.y],
      ...ANNOTATION_STYLES[AnnotationType.FREEHAND]
    });
    this.annotationGroup.add(this.#currentShape);
    this.layer.draw();
  }

  /**
   * 更新自由绘制
   */
  _updateFreehand(pos) {
    const points = this.#currentShape.points().concat([pos.x, pos.y]);
    this.#currentShape.points(points);
    this.layer.draw();
  }

  /**
   * 检查是否是有效的标注
   */
  _isValidAnnotation(pos) {
    const minDistance = 5; // 最小距离阈值
    
    switch (this.#currentTool) {
      case AnnotationTool.RECTANGLE:
      case AnnotationTool.HIGHLIGHT:
        return Math.abs(pos.x - this.#startPos.x) > minDistance || 
               Math.abs(pos.y - this.#startPos.y) > minDistance;
      case AnnotationTool.UNDERLINE:
      case AnnotationTool.STRIKETHROUGH:
        return Math.abs(pos.x - this.#startPos.x) > minDistance || 
               Math.abs(pos.y - this.#startPos.y) > minDistance;
      case AnnotationTool.FREEHAND:
        return this.#currentShape.points().length > 4; // 至少两个点
      default:
        return false;
    }
  }

  /**
   * 创建标注数据
   */
  _createAnnotationData(shape, endPos) {
    const annotation = {
      id: this._generateId(),
      type: this.#currentTool,
      shape: shape,
      startPos: this.#startPos,
      endPos: endPos,
      timestamp: Date.now(),
      pageNumber: this.pdfPage.pageNumber
    };

    // 添加特定类型的数据
    switch (this.#currentTool) {
      case AnnotationTool.RECTANGLE:
      case AnnotationTool.HIGHLIGHT:
        annotation.rect = {
          x: shape.x(),
          y: shape.y(),
          width: shape.width(),
          height: shape.height()
        };
        break;
      case AnnotationTool.UNDERLINE:
      case AnnotationTool.STRIKETHROUGH:
        annotation.line = {
          points: shape.points()
        };
        break;
      case AnnotationTool.FREEHAND:
        annotation.path = {
          points: shape.points()
        };
        break;
    }

    return annotation;
  }

  /**
   * 添加标注交互功能
   */
  _addAnnotationInteraction(shape, annotation) {
    // 添加点击选择功能
    shape.on("click", () => {
      this._selectAnnotation(annotation);
    });

    // 添加右键删除功能
    shape.on("contextmenu", (e) => {
      e.evt.preventDefault();
      this._showContextMenu(annotation, e.evt.pageX, e.evt.pageY);
    });

    // 添加拖拽功能
    shape.draggable(true);
    shape.on("dragend", () => {
      this._updateAnnotationPosition(annotation);
    });
  }

  /**
   * 选择标注
   */
  _selectAnnotation(annotation) {
    // 清除之前的选择
    this._clearSelection();

    // 高亮选中的标注
    annotation.shape.strokeWidth(annotation.shape.strokeWidth() + 2);
    annotation.shape.stroke("#ff6b6b");
    annotation.selected = true;
    
    this.layer.draw();
  }

  /**
   * 清除选择
   */
  _clearSelection() {
    this.#annotations.forEach(annotation => {
      if (annotation.selected) {
        // 恢复原始样式
        const originalStyle = ANNOTATION_STYLES[annotation.type];
        annotation.shape.setAttrs(originalStyle);
        annotation.selected = false;
      }
    });
    this.layer.draw();
  }

  /**
   * 显示上下文菜单
   */
  _showContextMenu(annotation, x, y) {
    const contextMenu = document.createElement("div");
    contextMenu.className = "konva-context-menu";
    contextMenu.style.position = "fixed";
    contextMenu.style.left = x + "px";
    contextMenu.style.top = y + "px";
    contextMenu.style.backgroundColor = "white";
    contextMenu.style.border = "1px solid #ccc";
    contextMenu.style.borderRadius = "4px";
    contextMenu.style.padding = "8px";
    contextMenu.style.zIndex = "9999";
    contextMenu.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "删除";
    deleteBtn.style.border = "none";
    deleteBtn.style.background = "none";
    deleteBtn.style.padding = "4px 8px";
    deleteBtn.style.cursor = "pointer";
    deleteBtn.onclick = () => {
      this._deleteAnnotation(annotation);
      document.body.removeChild(contextMenu);
    };

    contextMenu.appendChild(deleteBtn);
    document.body.appendChild(contextMenu);

    // 点击其他地方关闭菜单
    const closeMenu = (e) => {
      if (!contextMenu.contains(e.target)) {
        document.body.removeChild(contextMenu);
        document.removeEventListener("click", closeMenu);
      }
    };
    setTimeout(() => document.addEventListener("click", closeMenu), 0);
  }

  /**
   * 删除标注
   */
  _deleteAnnotation(annotation) {
    // 从数组中移除
    const index = this.#annotations.indexOf(annotation);
    if (index > -1) {
      this.#annotations.splice(index, 1);
    }

    // 从Konva中移除
    annotation.shape.destroy();
    this.layer.draw();

    // 触发回调
    this.onAnnotationDeleted?.(annotation);
  }

  /**
   * 更新标注位置
   */
  _updateAnnotationPosition(annotation) {
    // 更新标注数据
    if (annotation.rect) {
      annotation.rect.x = annotation.shape.x();
      annotation.rect.y = annotation.shape.y();
    }

    // 触发回调
    this.onAnnotationUpdated?.(annotation);
  }

  /**
   * 生成唯一ID
   */
  _generateId() {
    return "annotation_" + Math.random().toString(36).substr(2, 9);
  }

  /**
   * 获取所有标注
   */
  getAnnotations() {
    return this.#annotations;
  }

  /**
   * 清除所有标注
   */
  clearAnnotations() {
    this.#annotations.forEach(annotation => {
      annotation.shape.destroy();
    });
    this.#annotations = [];
    this.layer.draw();
  }

  /**
   * 导出标注数据
   */
  exportAnnotations() {
    return this.#annotations.map(annotation => ({
      id: annotation.id,
      type: annotation.type,
      startPos: annotation.startPos,
      endPos: annotation.endPos,
      rect: annotation.rect,
      line: annotation.line,
      path: annotation.path,
      timestamp: annotation.timestamp,
      pageNumber: annotation.pageNumber
    }));
  }

  /**
   * 导入标注数据
   */
  importAnnotations(annotationsData) {
    this.clearAnnotations();
    
    annotationsData.forEach(data => {
      let shape;
      
      switch (data.type) {
        case AnnotationTool.RECTANGLE:
          shape = new Konva.Rect({
            x: data.rect.x,
            y: data.rect.y,
            width: data.rect.width,
            height: data.rect.height,
            ...ANNOTATION_STYLES[AnnotationType.RECTANGLE]
          });
          break;
        case AnnotationTool.HIGHLIGHT:
          shape = new Konva.Rect({
            x: data.rect.x,
            y: data.rect.y,
            width: data.rect.width,
            height: data.rect.height,
            ...ANNOTATION_STYLES[AnnotationType.HIGHLIGHT]
          });
          break;
        case AnnotationTool.UNDERLINE:
          shape = new Konva.Line({
            points: data.line.points,
            ...ANNOTATION_STYLES[AnnotationType.UNDERLINE]
          });
          break;
        case AnnotationTool.STRIKETHROUGH:
          shape = new Konva.Line({
            points: data.line.points,
            ...ANNOTATION_STYLES[AnnotationType.STRIKETHROUGH]
          });
          break;
        case AnnotationTool.FREEHAND:
          shape = new Konva.Line({
            points: data.path.points,
            ...ANNOTATION_STYLES[AnnotationType.FREEHAND]
          });
          break;
      }
      
      if (shape) {
        this.annotationGroup.add(shape);
        
        const annotation = {
          id: data.id,
          type: data.type,
          shape: shape,
          startPos: data.startPos,
          endPos: data.endPos,
          rect: data.rect,
          line: data.line,
          path: data.path,
          timestamp: data.timestamp,
          pageNumber: data.pageNumber
        };
        
        this.#annotations.push(annotation);
        this._addAnnotationInteraction(shape, annotation);
      }
    });
    
    this.layer.draw();
  }

  /**
   * 更新视口
   */
  updateViewport(viewport) {
    this.viewport = viewport;
    if (this.stage) {
      this.stage.width(viewport.width);
      this.stage.height(viewport.height);
      this.layer.draw();
    }
  }

  /**
   * 隐藏层
   */
  hide() {
    if (this.div) {
      this.div.style.display = "none";
    }
  }

  /**
   * 显示层
   */
  show() {
    if (this.div) {
      this.div.style.display = "block";
    }
  }

  /**
   * 取消
   */
  cancel() {
    this._cancelled = true;
    this.#eventAbortController?.abort();
    this.#eventAbortController = null;
  }

  /**
   * 销毁
   */
  destroy() {
    this.cancel();
    this.clearAnnotations();
    this.stage?.destroy();
    this.div?.remove();
  }
}

export { KonvaAnnotationLayerBuilder };