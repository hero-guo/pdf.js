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
 * Konva标注工具栏
 */
class KonvaAnnotationToolbar {
  constructor(options = {}) {
    this.container = options.container;
    this.eventBus = options.eventBus;
    this.onToolChanged = options.onToolChanged;
    
    this.currentTool = AnnotationTool.NONE;
    this.toolbar = null;
    this.toolButtons = new Map();
    this.panelButton = null;
    this.clearButton = null;
    this.exportButton = null;
    this.importButton = null;
    this.importInput = null;
    this.isEnabled = false;
    
    this._init();
  }

  _init() {
    this._createToolbar();
    this._createToolButtons();
    this._createActionButtons();
    this._bindEvents();
  }

  _createToolbar() {
    this.toolbar = document.createElement("div");
    this.toolbar.className = "konva-annotation-toolbar";
    this.toolbar.style.display = "none"; // 初始隐藏

    if (this.container) {
      this.container.appendChild(this.toolbar);
    }
  }

  _createToolButtons() {
    // 添加标签
    const label = document.createElement("label");
    label.textContent = "标注工具：";
    this.toolbar.appendChild(label);

    // 选择工具
    this._createToolButton(AnnotationTool.SELECT, "⚪", "选择工具");
    
    // 分隔符
    this._createSeparator();
    
    // 框选工具
    this._createToolButton(AnnotationTool.RECTANGLE, "🔲", "框选工具");
    
    // 下划线工具
    this._createToolButton(AnnotationTool.UNDERLINE, "📝", "下划线工具");
    
    // 删除线工具
    this._createToolButton(AnnotationTool.STRIKETHROUGH, "✖️", "删除线工具");
    
    // 高亮工具
    this._createToolButton(AnnotationTool.HIGHLIGHT, "🖍️", "高亮工具");
    
    // 自由绘制工具
    this._createToolButton(AnnotationTool.FREEHAND, "✏️", "自由绘制工具");
    
    // 分隔符
    this._createSeparator();
  }

  _createToolButton(tool, icon, tooltip) {
    const button = document.createElement("button");
    button.innerHTML = icon;
    button.setAttribute("data-tooltip", tooltip);
    button.addEventListener("click", () => this._selectTool(tool));
    
    this.toolbar.appendChild(button);
    this.toolButtons.set(tool, button);
  }

  _createSeparator() {
    const separator = document.createElement("div");
    separator.className = "separator";
    this.toolbar.appendChild(separator);
  }

  _createActionButtons() {
    // 面板切换按钮
    this.panelButton = document.createElement("button");
    this.panelButton.innerHTML = "📋";
    this.panelButton.setAttribute("data-tooltip", "显示/隐藏标注面板");
    this.panelButton.addEventListener("click", () => this._togglePanel());
    this.toolbar.appendChild(this.panelButton);

    // 清除所有标注按钮
    this.clearButton = document.createElement("button");
    this.clearButton.innerHTML = "🗑️";
    this.clearButton.setAttribute("data-tooltip", "清除所有标注");
    this.clearButton.addEventListener("click", () => this._clearAll());
    this.toolbar.appendChild(this.clearButton);

    // 导出按钮
    this.exportButton = document.createElement("button");
    this.exportButton.innerHTML = "📤";
    this.exportButton.setAttribute("data-tooltip", "导出标注");
    this.exportButton.addEventListener("click", () => this._export());
    this.toolbar.appendChild(this.exportButton);

    // 导入按钮
    this.importButton = document.createElement("button");
    this.importButton.innerHTML = "📥";
    this.importButton.setAttribute("data-tooltip", "导入标注");
    this.importButton.addEventListener("click", () => this._import());
    this.toolbar.appendChild(this.importButton);

    // 隐藏的文件输入
    this.importInput = document.createElement("input");
    this.importInput.type = "file";
    this.importInput.accept = ".json";
    this.importInput.style.display = "none";
    this.importInput.addEventListener("change", (e) => this._handleFileImport(e));
    this.toolbar.appendChild(this.importInput);
  }

  _bindEvents() {
    // 监听键盘快捷键
    document.addEventListener("keydown", (e) => this._handleKeydown(e));
  }

  _handleKeydown(e) {
    if (!this.isEnabled) return;

    // 只在没有焦点在输入框时处理快捷键
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
      return;
    }

    switch (e.key) {
      case "Escape":
        this._selectTool(AnnotationTool.NONE);
        break;
      case "s":
      case "S":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this._selectTool(AnnotationTool.SELECT);
        }
        break;
      case "r":
      case "R":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this._selectTool(AnnotationTool.RECTANGLE);
        }
        break;
      case "u":
      case "U":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this._selectTool(AnnotationTool.UNDERLINE);
        }
        break;
      case "d":
      case "D":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this._selectTool(AnnotationTool.STRIKETHROUGH);
        }
        break;
      case "h":
      case "H":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this._selectTool(AnnotationTool.HIGHLIGHT);
        }
        break;
      case "f":
      case "F":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this._selectTool(AnnotationTool.FREEHAND);
        }
        break;
      case "Delete":
      case "Backspace":
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          this._clearAll();
        }
        break;
    }
  }

  _selectTool(tool) {
    // 更新当前工具
    this.currentTool = tool;
    
    // 更新按钮状态
    this.toolButtons.forEach((button, buttonTool) => {
      if (buttonTool === tool) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });
    
    // 通知外部
    this.onToolChanged?.(tool);
    
    // 触发事件
    this.eventBus?.dispatch("konvaannotationtoolchanged", {
      source: this,
      tool,
    });
  }

  _togglePanel() {
    this.eventBus?.dispatch("konvaannotationpaneltoggle", {
      source: this,
    });
  }

  _clearAll() {
    if (confirm("确定要清除所有标注吗？此操作不可撤销。")) {
      this.eventBus?.dispatch("konvaannotationclearall", {
        source: this,
      });
    }
  }

  _export() {
    this.eventBus?.dispatch("konvaannotationexport", {
      source: this,
    });
  }

  _import() {
    this.importInput.click();
  }

  _handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const annotations = JSON.parse(e.target.result);
        this.eventBus?.dispatch("konvaannotationimport", {
          source: this,
          annotations,
        });
      } catch (error) {
        console.error("导入标注失败:", error);
        alert("导入失败：文件格式错误");
      }
    };
    reader.readAsText(file);
  }

  /**
   * 启用工具栏
   */
  enable() {
    this.isEnabled = true;
    this.toolbar.style.display = "flex";
    this.toolButtons.forEach(button => {
      button.disabled = false;
    });
    this.clearButton.disabled = false;
    this.exportButton.disabled = false;
    this.importButton.disabled = false;
    this.panelButton.disabled = false;
  }

  /**
   * 禁用工具栏
   */
  disable() {
    this.isEnabled = false;
    this.toolbar.style.display = "none";
    this.toolButtons.forEach(button => {
      button.disabled = true;
    });
    this.clearButton.disabled = true;
    this.exportButton.disabled = true;
    this.importButton.disabled = true;
    this.panelButton.disabled = true;
    this._selectTool(AnnotationTool.NONE);
  }

  /**
   * 显示工具栏
   */
  show() {
    this.toolbar.style.display = "flex";
  }

  /**
   * 隐藏工具栏
   */
  hide() {
    this.toolbar.style.display = "none";
  }

  /**
   * 获取当前工具
   */
  getCurrentTool() {
    return this.currentTool;
  }

  /**
   * 设置当前工具
   */
  setCurrentTool(tool) {
    this._selectTool(tool);
  }

  /**
   * 更新按钮状态
   */
  updateButtonStates(annotationCount = 0) {
    this.clearButton.disabled = annotationCount === 0;
    this.exportButton.disabled = annotationCount === 0;
  }

  /**
   * 销毁工具栏
   */
  destroy() {
    this.toolbar?.remove();
    this.importInput?.remove();
    document.removeEventListener("keydown", this._handleKeydown);
  }
}

export { KonvaAnnotationToolbar };