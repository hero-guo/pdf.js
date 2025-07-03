/**
 * Golden Ratio Viewport Manager for PDF.js
 * 
 * 实现固定viewport功能，页面宽度为可视区域的黄金分割比例
 * 兼容现有的缩放逻辑，支持放大缩小操作
 * 
 * @author Assistant
 * @version 1.0.0
 */

// 黄金分割比例常量
const GOLDEN_RATIO = (Math.sqrt(5) - 1) / 2; // ≈ 0.618
const PHI = 1 + GOLDEN_RATIO; // ≈ 1.618

/**
 * 黄金分割比例Viewport管理器
 */
class GoldenRatioViewportManager {
  constructor(pdfViewer, options = {}) {
    this.pdfViewer = pdfViewer;
    this.options = {
      ratio: GOLDEN_RATIO, // 默认使用黄金分割比例
      minScale: 0.1,       // 最小缩放比例
      maxScale: 10.0,      // 最大缩放比例
      enableResize: true,  // 是否启用窗口大小变化监听
      preserveCenter: true, // 缩放时是否保持页面中心位置
      debounceDelay: 150,  // 防抖延迟时间（毫秒）
      saveToStorage: true, // 是否保存到本地存储
      ...options
    };

    // 状态管理
    this.isActive = false;
    this.baseScale = 1.0;           // 基准缩放比例
    this.currentMultiplier = 1.0;   // 当前缩放倍数
    this.targetPageWidth = 0;       // 目标页面宽度
    
    // 事件处理
    this.resizeTimeout = null;
    this.originalSetScale = null;
    
    // 绑定方法
    this.handleResize = this.debounce(this.handleResize.bind(this), this.options.debounceDelay);
    this.handleScaleChange = this.handleScaleChange.bind(this);
    
    this.init();
  }

  /**
   * 初始化管理器
   */
  init() {
    // 保存原始的setScale方法
    this.originalSetScale = this.pdfViewer.constructor.prototype.currentScaleValue;
    
    // 监听文档加载事件
    this.pdfViewer.eventBus._on('documentloaded', () => {
      if (this.isActive) {
        this.calculateAndApply();
      }
    });

    // 监听页面变化事件
    this.pdfViewer.eventBus._on('pagechanging', () => {
      if (this.isActive) {
        this.calculateAndApply();
      }
    });

    // 加载保存的设置
    this.loadSettings();

    // 如果启用了窗口监听，添加resize事件
    if (this.options.enableResize) {
      window.addEventListener('resize', this.handleResize);
    }
  }

  /**
   * 启用黄金分割比例viewport
   */
  enable() {
    if (this.isActive) return;
    
    this.isActive = true;
    this.calculateAndApply();
    this.saveSettings();
    
    // 触发自定义事件
    this.pdfViewer.eventBus.dispatch('goldenratioviewportchanged', {
      source: this,
      enabled: true,
      ratio: this.options.ratio
    });
  }

  /**
   * 禁用黄金分割比例viewport
   */
  disable() {
    if (!this.isActive) return;
    
    this.isActive = false;
    
    // 恢复到自适应模式
    this.pdfViewer.currentScaleValue = 'auto';
    this.saveSettings();
    
    // 触发自定义事件
    this.pdfViewer.eventBus.dispatch('goldenratioviewportchanged', {
      source: this,
      enabled: false,
      ratio: this.options.ratio
    });
  }

  /**
   * 切换黄金分割比例viewport状态
   */
  toggle() {
    if (this.isActive) {
      this.disable();
    } else {
      this.enable();
    }
  }

  /**
   * 设置自定义比例
   * @param {number} ratio - 新的比例值 (0 < ratio < 1)
   */
  setRatio(ratio) {
    if (ratio <= 0 || ratio >= 1) {
      console.warn('Invalid ratio value. Must be between 0 and 1.');
      return;
    }
    
    this.options.ratio = ratio;
    
    if (this.isActive) {
      this.calculateAndApply();
    }
    
    this.saveSettings();
  }

  /**
   * 获取当前比例
   */
  getRatio() {
    return this.options.ratio;
  }

  /**
   * 计算并应用黄金分割比例缩放
   */
  calculateAndApply() {
    if (!this.pdfViewer.pdfDocument) {
      return;
    }

    const currentPage = this.pdfViewer._pages[this.pdfViewer._currentPageNumber - 1];
    if (!currentPage) {
      return;
    }

    // 计算可视区域的黄金分割宽度
    const containerWidth = this.pdfViewer.container.clientWidth;
    const scrollbarPadding = this.getScrollbarPadding();
    const availableWidth = containerWidth - scrollbarPadding;
    this.targetPageWidth = availableWidth * this.options.ratio;

    // 计算基准缩放比例
    this.baseScale = this.targetPageWidth / currentPage.width;
    
    // 应用当前倍数
    const finalScale = this.baseScale * this.currentMultiplier;
    
    // 限制在允许的范围内
    const clampedScale = Math.max(this.options.minScale, 
                                 Math.min(this.options.maxScale, finalScale));
    
    // 应用缩放
    this.applyScale(clampedScale);
  }

  /**
   * 应用缩放比例
   * @param {number} scale - 缩放比例
   */
  applyScale(scale) {
    // 保存当前滚动位置
    const scrollPosition = this.options.preserveCenter ? this.getCurrentScrollCenter() : null;
    
    // 暂时禁用事件监听，避免循环触发
    this.isApplying = true;
    
    // 应用缩放
    this.pdfViewer.currentScale = scale;
    
    // 恢复滚动位置
    if (scrollPosition && this.options.preserveCenter) {
      setTimeout(() => {
        this.restoreScrollCenter(scrollPosition, scale);
      }, 0);
    }
    
    this.isApplying = false;
  }

  /**
   * 兼容原有的缩放操作（放大/缩小）
   * @param {number} scaleFactor - 缩放因子
   */
  updateScale(scaleFactor) {
    if (!this.isActive) {
      return;
    }

    // 更新倍数
    this.currentMultiplier *= scaleFactor;
    
    // 重新计算并应用
    this.calculateAndApply();
  }

  /**
   * 重置缩放倍数为1.0
   */
  resetScale() {
    if (!this.isActive) {
      return;
    }

    this.currentMultiplier = 1.0;
    this.calculateAndApply();
  }

  /**
   * 处理窗口大小变化
   */
  handleResize() {
    if (!this.isActive) {
      return;
    }

    this.calculateAndApply();
  }

  /**
   * 处理缩放变化事件
   * @param {Object} evt - 事件对象
   */
  handleScaleChange(evt) {
    if (!this.isActive || this.isApplying) {
      return;
    }

    // 如果是外部触发的缩放变化，更新倍数
    if (evt.source !== this) {
      const newScale = evt.scale;
      this.currentMultiplier = newScale / this.baseScale;
    }
  }

  /**
   * 获取滚动条占用空间
   */
  getScrollbarPadding() {
    const container = this.pdfViewer.container;
    const hasVerticalScrollbar = container.scrollHeight > container.clientHeight;
    const hasHorizontalScrollbar = container.scrollWidth > container.clientWidth;
    
    // 估算滚动条宽度（通常为15-20px）
    const scrollbarWidth = 17;
    
    let padding = 0;
    if (hasVerticalScrollbar) padding += scrollbarWidth;
    if (hasHorizontalScrollbar) padding += scrollbarWidth;
    
    return padding;
  }

  /**
   * 获取当前滚动中心位置
   */
  getCurrentScrollCenter() {
    const container = this.pdfViewer.container;
    return {
      x: container.scrollLeft + container.clientWidth / 2,
      y: container.scrollTop + container.clientHeight / 2,
      containerWidth: container.clientWidth,
      containerHeight: container.clientHeight
    };
  }

  /**
   * 恢复滚动中心位置
   */
  restoreScrollCenter(scrollPosition, newScale) {
    const container = this.pdfViewer.container;
    const oldScale = this.pdfViewer._currentScale || 1;
    const scaleRatio = newScale / oldScale;
    
    const newCenterX = scrollPosition.x * scaleRatio;
    const newCenterY = scrollPosition.y * scaleRatio;
    
    container.scrollLeft = newCenterX - container.clientWidth / 2;
    container.scrollTop = newCenterY - container.clientHeight / 2;
  }

  /**
   * 防抖函数
   */
  debounce(func, delay) {
    return (...args) => {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = setTimeout(() => func.apply(this, args), delay);
    };
  }

  /**
   * 保存设置到本地存储
   */
  saveSettings() {
    if (!this.options.saveToStorage) return;

    const settings = {
      isActive: this.isActive,
      ratio: this.options.ratio,
      multiplier: this.currentMultiplier
    };

    try {
      localStorage.setItem('goldenRatioViewport', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save golden ratio viewport settings:', e);
    }
  }

  /**
   * 从本地存储加载设置
   */
  loadSettings() {
    if (!this.options.saveToStorage) return;

    try {
      const saved = localStorage.getItem('goldenRatioViewport');
      if (saved) {
        const settings = JSON.parse(saved);
        this.isActive = settings.isActive || false;
        this.options.ratio = settings.ratio || GOLDEN_RATIO;
        this.currentMultiplier = settings.multiplier || 1.0;
      }
    } catch (e) {
      console.warn('Failed to load golden ratio viewport settings:', e);
    }
  }

  /**
   * 获取当前状态信息
   */
  getStatus() {
    return {
      isActive: this.isActive,
      ratio: this.options.ratio,
      baseScale: this.baseScale,
      currentMultiplier: this.currentMultiplier,
      finalScale: this.baseScale * this.currentMultiplier,
      targetPageWidth: this.targetPageWidth
    };
  }

  /**
   * 销毁管理器，清理资源
   */
  destroy() {
    // 禁用功能
    this.disable();

    // 移除事件监听器
    if (this.options.enableResize) {
      window.removeEventListener('resize', this.handleResize);
    }

    // 清理定时器
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }

    // 重置状态
    this.isActive = false;
    this.pdfViewer = null;
  }
}

/**
 * PDF.js 缩放系统扩展
 * 为PDF.js添加黄金分割比例缩放模式
 */
class PDFViewerGoldenRatioExtension {
  constructor(pdfViewer) {
    this.pdfViewer = pdfViewer;
    this.goldenRatioManager = new GoldenRatioViewportManager(pdfViewer);
    this.originalSetScale = null;
    this.init();
  }

  init() {
    // 扩展PDF.js的缩放系统
    this.extendScaleSystem();
    
    // 监听缩放变化事件
    this.pdfViewer.eventBus._on('scalechanging', (evt) => {
      this.goldenRatioManager.handleScaleChange(evt);
    });
  }

  /**
   * 扩展PDF.js的缩放系统，添加黄金分割比例模式
   */
  extendScaleSystem() {
    const originalSetScale = this.pdfViewer.constructor.prototype._PDFViewer__setScale || 
                            this.pdfViewer._PDFViewer__setScale ||
                            this.pdfViewer.setScale;

    if (!originalSetScale) {
      console.warn('Cannot find original setScale method');
      return;
    }

    // 保存原始方法
    this.originalSetScale = originalSetScale.bind(this.pdfViewer);

    // 创建扩展的setScale方法
    const extendedSetScale = (value, options = {}) => {
      if (value === 'golden-ratio') {
        // 处理黄金分割比例模式
        this.goldenRatioManager.enable();
        return;
      }

      // 如果设置了其他缩放模式，禁用黄金分割比例
      if (this.goldenRatioManager.isActive && typeof value === 'string') {
        this.goldenRatioManager.disable();
      }

      // 调用原始方法
      return this.originalSetScale(value, options);
    };

    // 替换方法
    if (this.pdfViewer._PDFViewer__setScale) {
      this.pdfViewer._PDFViewer__setScale = extendedSetScale;
    } else if (this.pdfViewer.setScale) {
      this.pdfViewer.setScale = extendedSetScale;
    }
  }

  /**
   * 获取黄金分割比例管理器
   */
  getGoldenRatioManager() {
    return this.goldenRatioManager;
  }

  /**
   * 销毁扩展
   */
  destroy() {
    this.goldenRatioManager.destroy();
    
    // 恢复原始方法
    if (this.originalSetScale) {
      if (this.pdfViewer._PDFViewer__setScale) {
        this.pdfViewer._PDFViewer__setScale = this.originalSetScale;
      } else if (this.pdfViewer.setScale) {
        this.pdfViewer.setScale = this.originalSetScale;
      }
    }
  }
}

/**
 * 工具栏集成组件
 */
class GoldenRatioToolbar {
  constructor(pdfViewer, containerId = 'goldenRatioToolbar') {
    this.pdfViewer = pdfViewer;
    this.containerId = containerId;
    this.extension = new PDFViewerGoldenRatioExtension(pdfViewer);
    this.manager = this.extension.getGoldenRatioManager();
    
    this.createToolbar();
    this.bindEvents();
  }

  createToolbar() {
    const container = document.getElementById(this.containerId) || this.createContainer();
    
    container.innerHTML = `
      <div class="golden-ratio-controls">
        <label>
          <input type="checkbox" id="goldenRatioToggle" ${this.manager.isActive ? 'checked' : ''}>
          黄金分割比例视图
        </label>
        <div class="ratio-controls" style="display: ${this.manager.isActive ? 'block' : 'none'}">
          <label>
            比例: <input type="range" id="ratioSlider" min="0.3" max="0.8" step="0.01" value="${this.manager.getRatio()}">
            <span id="ratioValue">${(this.manager.getRatio() * 100).toFixed(1)}%</span>
          </label>
          <div class="preset-buttons">
            <button id="goldenRatioPreset" title="黄金分割比例 (61.8%)">φ</button>
            <button id="resetScale" title="重置缩放">重置</button>
          </div>
        </div>
      </div>
    `;

    // 添加样式
    this.addStyles();
  }

  createContainer() {
    const container = document.createElement('div');
    container.id = this.containerId;
    container.className = 'golden-ratio-toolbar';
    
    // 插入到合适的位置（通常在主工具栏附近）
    const toolbar = document.getElementById('toolbarContainer') || 
                   document.getElementById('mainContainer') || 
                   document.body;
    toolbar.appendChild(container);
    
    return container;
  }

  bindEvents() {
    // 切换开关
    document.getElementById('goldenRatioToggle').addEventListener('change', (e) => {
      if (e.target.checked) {
        this.manager.enable();
      } else {
        this.manager.disable();
      }
      this.updateUI();
    });

    // 比例滑块
    const ratioSlider = document.getElementById('ratioSlider');
    const ratioValue = document.getElementById('ratioValue');
    
    ratioSlider.addEventListener('input', (e) => {
      const ratio = parseFloat(e.target.value);
      this.manager.setRatio(ratio);
      ratioValue.textContent = (ratio * 100).toFixed(1) + '%';
    });

    // 黄金分割比例预设按钮
    document.getElementById('goldenRatioPreset').addEventListener('click', () => {
      this.manager.setRatio(GOLDEN_RATIO);
      this.updateUI();
    });

    // 重置缩放按钮
    document.getElementById('resetScale').addEventListener('click', () => {
      this.manager.resetScale();
    });

    // 监听状态变化
    this.pdfViewer.eventBus._on('goldenratioviewportchanged', () => {
      this.updateUI();
    });
  }

  updateUI() {
    const toggle = document.getElementById('goldenRatioToggle');
    const controls = document.querySelector('.ratio-controls');
    const ratioSlider = document.getElementById('ratioSlider');
    const ratioValue = document.getElementById('ratioValue');

    toggle.checked = this.manager.isActive;
    controls.style.display = this.manager.isActive ? 'block' : 'none';
    
    const currentRatio = this.manager.getRatio();
    ratioSlider.value = currentRatio;
    ratioValue.textContent = (currentRatio * 100).toFixed(1) + '%';
  }

  addStyles() {
    if (document.getElementById('goldenRatioStyles')) return;

    const style = document.createElement('style');
    style.id = 'goldenRatioStyles';
    style.textContent = `
      .golden-ratio-toolbar {
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        background: #f9f9f9;
        margin: 10px 0;
      }

      .golden-ratio-controls label {
        display: block;
        margin-bottom: 8px;
        font-weight: bold;
      }

      .ratio-controls {
        margin-left: 20px;
        padding: 10px;
        background: white;
        border-radius: 4px;
        border: 1px solid #ddd;
      }

      .ratio-controls label {
        font-weight: normal;
        display: flex;
        align-items: center;
        gap: 10px;
      }

      #ratioSlider {
        flex: 1;
        margin: 0 10px;
      }

      #ratioValue {
        min-width: 50px;
        text-align: right;
        font-family: monospace;
      }

      .preset-buttons {
        margin-top: 10px;
        display: flex;
        gap: 10px;
      }

      .preset-buttons button {
        padding: 5px 10px;
        border: 1px solid #ccc;
        background: white;
        border-radius: 3px;
        cursor: pointer;
      }

      .preset-buttons button:hover {
        background: #f0f0f0;
      }

      #goldenRatioPreset {
        font-weight: bold;
        color: #d4af37;
      }
    `;

    document.head.appendChild(style);
  }

  destroy() {
    this.extension.destroy();
    const container = document.getElementById(this.containerId);
    if (container) {
      container.remove();
    }
    
    const styles = document.getElementById('goldenRatioStyles');
    if (styles) {
      styles.remove();
    }
  }
}

// 导出类和常量
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GoldenRatioViewportManager,
    PDFViewerGoldenRatioExtension,
    GoldenRatioToolbar,
    GOLDEN_RATIO,
    PHI
  };
} else if (typeof window !== 'undefined') {
  // 浏览器环境
  window.GoldenRatioViewportManager = GoldenRatioViewportManager;
  window.PDFViewerGoldenRatioExtension = PDFViewerGoldenRatioExtension;
  window.GoldenRatioToolbar = GoldenRatioToolbar;
  window.GOLDEN_RATIO = GOLDEN_RATIO;
  window.PHI = PHI;
}

/**
 * 使用示例：
 * 
 * // 基本使用
 * const goldenManager = new GoldenRatioViewportManager(pdfViewer);
 * goldenManager.enable();
 * 
 * // 完整集成（推荐）
 * const extension = new PDFViewerGoldenRatioExtension(pdfViewer);
 * const toolbar = new GoldenRatioToolbar(pdfViewer);
 * 
 * // 通过缩放值设置
 * pdfViewer.currentScaleValue = 'golden-ratio';
 * 
 * // 自定义比例
 * const manager = extension.getGoldenRatioManager();
 * manager.setRatio(0.6); // 60%宽度
 */