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

import { AnnotationTool } from "./konva_annotation_layer_builder.js";

/**
 * Konva标注面板
 */
class KonvaAnnotationPanel {
  constructor(options = {}) {
    this.container = options.container;
    this.eventBus = options.eventBus;
    this.onAnnotationSelect = options.onAnnotationSelect;
    this.onAnnotationDelete = options.onAnnotationDelete;
    
    this.panel = null;
    this.header = null;
    this.content = null;
    this.annotationList = null;
    this.statsContainer = null;
    this.exportContainer = null;
    this.annotations = [];
    this.isVisible = false;
    this.selectedAnnotation = null;
    
    this._init();
  }

  _init() {
    this._createPanel();
    this._createHeader();
    this._createContent();
    this._bindEvents();
  }

  _createPanel() {
    this.panel = document.createElement("div");
    this.panel.className = "konva-annotation-panel collapsed";
    
    if (this.container) {
      this.container.appendChild(this.panel);
    }
  }

  _createHeader() {
    this.header = document.createElement("div");
    this.header.className = "konva-annotation-panel-header";
    
    const title = document.createElement("h3");
    title.textContent = "标注列表";
    
    const closeButton = document.createElement("button");
    closeButton.innerHTML = "×";
    closeButton.addEventListener("click", () => this.hide());
    
    this.header.appendChild(title);
    this.header.appendChild(closeButton);
    this.panel.appendChild(this.header);
  }

  _createContent() {
    this.content = document.createElement("div");
    this.content.className = "konva-annotation-panel-content";
    
    // 创建统计区域
    this._createStatsContainer();
    
    // 创建标注列表
    this._createAnnotationList();
    
    // 创建导出区域
    this._createExportContainer();
    
    this.panel.appendChild(this.content);
  }

  _createStatsContainer() {
    this.statsContainer = document.createElement("div");
    this.statsContainer.className = "konva-annotation-stats";
    this.content.appendChild(this.statsContainer);
    
    this._updateStats();
  }

  _createAnnotationList() {
    this.annotationList = document.createElement("ul");
    this.annotationList.className = "konva-annotation-list";
    this.content.appendChild(this.annotationList);
    
    this._updateAnnotationList();
  }

  _createExportContainer() {
    this.exportContainer = document.createElement("div");
    this.exportContainer.className = "konva-annotation-export";
    
    const exportButton = document.createElement("button");
    exportButton.textContent = "导出JSON";
    exportButton.addEventListener("click", () => this._exportAnnotations());
    
    const exportImageButton = document.createElement("button");
    exportImageButton.textContent = "导出图片";
    exportImageButton.addEventListener("click", () => this._exportImage());
    
    this.exportContainer.appendChild(exportButton);
    this.exportContainer.appendChild(exportImageButton);
    this.content.appendChild(this.exportContainer);
  }

  _bindEvents() {
    // 监听窗口大小变化
    window.addEventListener("resize", () => this._handleResize());
  }

  _handleResize() {
    // 在移动设备上调整面板位置
    if (window.innerWidth <= 768) {
      this.panel.style.position = "fixed";
      this.panel.style.top = "50%";
      this.panel.style.right = "0";
      this.panel.style.height = "50%";
      this.panel.style.width = "100%";
    } else {
      this.panel.style.position = "absolute";
      this.panel.style.top = "0";
      this.panel.style.right = "0";
      this.panel.style.height = "100%";
      this.panel.style.width = "300px";
    }
  }

  _updateStats() {
    const stats = this._calculateStats();
    
    this.statsContainer.innerHTML = "";
    
    Object.entries(stats).forEach(([type, count]) => {
      if (count > 0) {
        const item = document.createElement("div");
        item.className = "konva-annotation-stats-item";
        
        const label = document.createElement("span");
        label.textContent = this._getTypeLabel(type);
        
        const countSpan = document.createElement("span");
        countSpan.className = "konva-annotation-stats-count";
        countSpan.textContent = count;
        
        item.appendChild(label);
        item.appendChild(countSpan);
        this.statsContainer.appendChild(item);
      }
    });
    
    // 如果没有标注，显示提示
    if (this.annotations.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "konva-annotation-empty";
      emptyState.innerHTML = `
        <div class="konva-annotation-empty-icon">📝</div>
        <div class="konva-annotation-empty-text">暂无标注</div>
        <div class="konva-annotation-empty-hint">使用工具栏中的工具开始标注</div>
      `;
      this.statsContainer.appendChild(emptyState);
    }
  }

  _calculateStats() {
    const stats = {};
    
    this.annotations.forEach(annotation => {
      const type = annotation.type;
      stats[type] = (stats[type] || 0) + 1;
    });
    
    return stats;
  }

  _getTypeLabel(type) {
    const labels = {
      [AnnotationTool.RECTANGLE]: "框选",
      [AnnotationTool.UNDERLINE]: "下划线",
      [AnnotationTool.STRIKETHROUGH]: "删除线",
      [AnnotationTool.HIGHLIGHT]: "高亮",
      [AnnotationTool.FREEHAND]: "自由绘制"
    };
    
    return labels[type] || type;
  }

  _updateAnnotationList() {
    this.annotationList.innerHTML = "";
    
    if (this.annotations.length === 0) {
      return;
    }
    
    // 按时间倒序排列
    const sortedAnnotations = [...this.annotations].sort((a, b) => b.timestamp - a.timestamp);
    
    sortedAnnotations.forEach(annotation => {
      const item = this._createAnnotationItem(annotation);
      this.annotationList.appendChild(item);
    });
  }

  _createAnnotationItem(annotation) {
    const item = document.createElement("li");
    item.className = "konva-annotation-item";
    item.dataset.annotationId = annotation.id;
    
    // 如果是选中的标注，添加选中样式
    if (this.selectedAnnotation?.id === annotation.id) {
      item.classList.add("selected");
    }
    
    // 头部信息
    const header = document.createElement("div");
    header.className = "konva-annotation-item-header";
    
    const type = document.createElement("span");
    type.className = `konva-annotation-item-type konva-annotation-type-${annotation.type}`;
    type.textContent = this._getTypeLabel(annotation.type);
    
    const time = document.createElement("span");
    time.className = "konva-annotation-item-time";
    time.textContent = this._formatTime(annotation.timestamp);
    
    header.appendChild(type);
    header.appendChild(time);
    
    // 内容信息
    const content = document.createElement("div");
    content.className = "konva-annotation-item-content";
    content.textContent = this._getAnnotationDescription(annotation);
    
    // 操作按钮
    const actions = document.createElement("div");
    actions.className = "konva-annotation-item-actions";
    
    const selectButton = document.createElement("button");
    selectButton.textContent = "选择";
    selectButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this._selectAnnotation(annotation);
    });
    
    const deleteButton = document.createElement("button");
    deleteButton.textContent = "删除";
    deleteButton.className = "danger";
    deleteButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this._deleteAnnotation(annotation);
    });
    
    actions.appendChild(selectButton);
    actions.appendChild(deleteButton);
    
    // 整个项目点击事件
    item.addEventListener("click", () => {
      this._selectAnnotation(annotation);
    });
    
    item.appendChild(header);
    item.appendChild(content);
    item.appendChild(actions);
    
    return item;
  }

  _formatTime(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }

  _getAnnotationDescription(annotation) {
    switch (annotation.type) {
      case AnnotationTool.RECTANGLE:
        return `矩形框选 (${Math.round(annotation.rect.width)}×${Math.round(annotation.rect.height)})`;
      case AnnotationTool.UNDERLINE:
      case AnnotationTool.STRIKETHROUGH:
        const length = Math.round(Math.sqrt(
          Math.pow(annotation.endPos.x - annotation.startPos.x, 2) +
          Math.pow(annotation.endPos.y - annotation.startPos.y, 2)
        ));
        return `线条长度: ${length}px`;
      case AnnotationTool.HIGHLIGHT:
        return `高亮区域 (${Math.round(annotation.rect.width)}×${Math.round(annotation.rect.height)})`;
      case AnnotationTool.FREEHAND:
        return `自由绘制 (${Math.round(annotation.path.points.length / 2)}点)`;
      default:
        return "未知类型";
    }
  }

  _selectAnnotation(annotation) {
    this.selectedAnnotation = annotation;
    this._updateAnnotationList();
    this.onAnnotationSelect?.(annotation);
    
    this.eventBus?.dispatch("konvaannotationselect", {
      source: this,
      annotation,
    });
  }

  _deleteAnnotation(annotation) {
    if (confirm("确定要删除这个标注吗？")) {
      this.annotations = this.annotations.filter(a => a.id !== annotation.id);
      this._updateStats();
      this._updateAnnotationList();
      this.onAnnotationDelete?.(annotation);
      
      this.eventBus?.dispatch("konvaannotationdelete", {
        source: this,
        annotation,
      });
    }
  }

  _exportAnnotations() {
    if (this.annotations.length === 0) {
      alert("没有标注可导出");
      return;
    }
    
    const data = {
      version: "1.0",
      timestamp: Date.now(),
      annotations: this.annotations.map(annotation => ({
        id: annotation.id,
        type: annotation.type,
        startPos: annotation.startPos,
        endPos: annotation.endPos,
        rect: annotation.rect,
        line: annotation.line,
        path: annotation.path,
        timestamp: annotation.timestamp,
        pageNumber: annotation.pageNumber
      }))
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `annotations_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  _exportImage() {
    this.eventBus?.dispatch("konvaannotationexportimage", {
      source: this,
    });
  }

  /**
   * 设置标注列表
   */
  setAnnotations(annotations) {
    this.annotations = annotations;
    this._updateStats();
    this._updateAnnotationList();
  }

  /**
   * 添加标注
   */
  addAnnotation(annotation) {
    this.annotations.push(annotation);
    this._updateStats();
    this._updateAnnotationList();
  }

  /**
   * 删除标注
   */
  removeAnnotation(annotation) {
    this.annotations = this.annotations.filter(a => a.id !== annotation.id);
    this._updateStats();
    this._updateAnnotationList();
  }

  /**
   * 更新标注
   */
  updateAnnotation(annotation) {
    const index = this.annotations.findIndex(a => a.id === annotation.id);
    if (index !== -1) {
      this.annotations[index] = annotation;
      this._updateAnnotationList();
    }
  }

  /**
   * 清除所有标注
   */
  clearAnnotations() {
    this.annotations = [];
    this.selectedAnnotation = null;
    this._updateStats();
    this._updateAnnotationList();
  }

  /**
   * 显示面板
   */
  show() {
    this.isVisible = true;
    this.panel.classList.remove("collapsed");
    this._handleResize();
  }

  /**
   * 隐藏面板
   */
  hide() {
    this.isVisible = false;
    this.panel.classList.add("collapsed");
  }

  /**
   * 切换面板显示状态
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * 获取面板是否可见
   */
  isVisible() {
    return this.isVisible;
  }

  /**
   * 获取标注数量
   */
  getAnnotationCount() {
    return this.annotations.length;
  }

  /**
   * 销毁面板
   */
  destroy() {
    this.panel?.remove();
    window.removeEventListener("resize", this._handleResize);
  }
}

export { KonvaAnnotationPanel };