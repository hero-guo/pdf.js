
class PDFAnnotationTool {
    constructor() {
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 1;
        this.scale = 1.0;
        this.canvas = null;
        this.ctx = null;
        this.stage = null;
        this.layer = null;
        this.currentTool = 'select';
        this.isDrawing = false;
        this.currentColor = '#e74c3c';
        this.currentStrokeWidth = 2;
        this.annotations = {};
        this.currentAnnotation = null;
        this.polygonPoints = [];
        this.textInputActive = false;
        
        this.init();
    }

    init() {
        // 设置PDF.js worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        this.setupEventListeners();
        this.setupCanvas();
        this.setupKonva();
        
        // 初始化工具按钮
        document.getElementById('selectTool').classList.add('active');
    }

    setupEventListeners() {
        // 文件上传
        document.getElementById('fileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadPDF(file);
            }
        });

        // 页面控制
        document.getElementById('prevPage').addEventListener('click', () => this.goToPrevPage());
        document.getElementById('nextPage').addEventListener('click', () => this.goToNextPage());
        document.getElementById('pageInput').addEventListener('change', (e) => {
            const page = parseInt(e.target.value);
            if (page >= 1 && page <= this.totalPages) {
                this.goToPage(page);
            }
        });

        // 缩放控制
        document.getElementById('zoomIn').addEventListener('click', () => this.zoomIn());
        document.getElementById('zoomOut').addEventListener('click', () => this.zoomOut());
        document.getElementById('fitPage').addEventListener('click', () => this.fitToPage());

        // 工具选择
        const tools = ['select', 'ink', 'text', 'highlight', 'underline', 'polygon', 'rectangle', 'circle', 'arrow'];
        tools.forEach(tool => {
            document.getElementById(tool + 'Tool').addEventListener('click', () => this.setTool(tool));
        });

        // 颜色选择
        document.querySelectorAll('.color-option').forEach(option => {
            option.addEventListener('click', (e) => {
                document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('active'));
                e.target.classList.add('active');
                this.currentColor = e.target.dataset.color;
            });
        });

        // 笔画粗细
        document.getElementById('strokeWidth').addEventListener('input', (e) => {
            this.currentStrokeWidth = parseInt(e.target.value);
            document.getElementById('strokeValue').textContent = e.target.value;
        });

        // 其他控制
        document.getElementById('clearAll').addEventListener('click', () => this.clearAllAnnotations());
        document.getElementById('saveAnnotations').addEventListener('click', () => this.saveAnnotations());
        document.getElementById('loadAnnotations').addEventListener('click', () => this.loadAnnotations());
        document.getElementById('annotationList').addEventListener('click', () => this.toggleAnnotationList());

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.cancelCurrentOperation();
            }
        });
    }

    setupCanvas() {
        this.canvas = document.getElementById('pdfCanvas');
        this.ctx = this.canvas.getContext('2d');
    }

    setupKonva() {
        // Konva stage将在PDF加载后创建
    }

    async loadPDF(file) {
        try {
            document.getElementById('loading').style.display = 'block';
            
            const arrayBuffer = await file.arrayBuffer();
            this.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            this.totalPages = this.pdfDoc.numPages;
            
            document.getElementById('pageCount').textContent = `/ ${this.totalPages}`;
            document.getElementById('pageInput').max = this.totalPages;
            
            await this.renderPage(1);
            this.setupKonvaStage();
            
            document.getElementById('loading').style.display = 'none';
        } catch (error) {
            console.error('PDF加载失败:', error);
            alert('PDF加载失败，请检查文件格式');
        }
    }

    async renderPage(pageNum) {
        const page = await this.pdfDoc.getPage(pageNum);
        const viewport = page.getViewport({ scale: this.scale });
        
        this.canvas.width = viewport.width;
        this.canvas.height = viewport.height;
        this.canvas.style.display = 'block';
        
        const renderContext = {
            canvasContext: this.ctx,
            viewport: viewport
        };
        
        await page.render(renderContext).promise;
        this.currentPage = pageNum;
        document.getElementById('pageInput').value = pageNum;
        
        // 更新Konva stage尺寸
        if (this.stage) {
            this.stage.width(viewport.width);
            this.stage.height(viewport.height);
            this.stage.draw();
        }
        
        // 加载该页面的标注
        this.loadPageAnnotations(pageNum);
    }

    setupKonvaStage() {
        const container = document.getElementById('annotationContainer');
        container.innerHTML = '';
        
        this.stage = new Konva.Stage({
            container: container,
            width: this.canvas.width,
            height: this.canvas.height
        });
        
        this.layer = new Konva.Layer();
        this.stage.add(this.layer);
        
        // 设置stage样式
        this.stage.container().style.position = 'absolute';
        this.stage.container().style.left = '50%';
        this.stage.container().style.top = '20px';
        this.stage.container().style.transform = 'translateX(-50%)';
        this.stage.container().style.borderRadius = '8px';
        this.stage.container().style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.1)';
        
        this.setupKonvaEvents();
    }

    setupKonvaEvents() {
        let isDrawing = false;
        let lastLine = null;
        let startPos = null;
        let tempShape = null;

        this.stage.on('mousedown', (e) => {
            if (this.currentTool === 'select') return;
            
            isDrawing = true;
            const pos = this.stage.getPointerPosition();
            startPos = pos;
            
            switch (this.currentTool) {
                case 'ink':
                    lastLine = new Konva.Line({
                        stroke: this.currentColor,
                        strokeWidth: this.currentStrokeWidth,
                        globalCompositeOperation: 'source-over',
                        lineCap: 'round',
                        lineJoin: 'round',
                        points: [pos.x, pos.y],
                    });
                    this.layer.add(lastLine);
                    break;
                    
                case 'text':
                    this.createTextAnnotation(pos);
                    break;
                    
                case 'highlight':
                    tempShape = new Konva.Rect({
                        x: pos.x,
                        y: pos.y,
                        width: 0,
                        height: 20,
                        fill: this.currentColor,
                        opacity: 0.3,
                    });
                    this.layer.add(tempShape);
                    break;
                    
                case 'underline':
                    tempShape = new Konva.Line({
                        stroke: this.currentColor,
                        strokeWidth: this.currentStrokeWidth,
                        points: [pos.x, pos.y, pos.x, pos.y],
                    });
                    this.layer.add(tempShape);
                    break;
                    
                case 'rectangle':
                    tempShape = new Konva.Rect({
                        x: pos.x,
                        y: pos.y,
                        width: 0,
                        height: 0,
                        stroke: this.currentColor,
                        strokeWidth: this.currentStrokeWidth,
                        fill: 'transparent',
                    });
                    this.layer.add(tempShape);
                    break;
                    
                case 'circle':
                    tempShape = new Konva.Circle({
                        x: pos.x,
                        y: pos.y,
                        radius: 0,
                        stroke: this.currentColor,
                        strokeWidth: this.currentStrokeWidth,
                        fill: 'transparent',
                    });
                    this.layer.add(tempShape);
                    break;
                    
                case 'polygon':
                    this.addPolygonPoint(pos);
                    break;
                    
                case 'arrow':
                    tempShape = new Konva.Arrow({
                        points: [pos.x, pos.y, pos.x, pos.y],
                        pointerLength: 10,
                        pointerWidth: 10,
                        fill: this.currentColor,
                        stroke: this.currentColor,
                        strokeWidth: this.currentStrokeWidth,
                    });
                    this.layer.add(tempShape);
                    break;
            }
        });

        this.stage.on('mousemove', (e) => {
            if (!isDrawing) return;
            
            const pos = this.stage.getPointerPosition();
            
            switch (this.currentTool) {
                case 'ink':
                    if (lastLine) {
                        const newPoints = lastLine.points().concat([pos.x, pos.y]);
                        lastLine.points(newPoints);
                    }
                    break;
                    
                case 'highlight':
                    if (tempShape) {
                        tempShape.width(pos.x - startPos.x);
                    }
                    break;
                    
                case 'underline':
                    if (tempShape) {
                        tempShape.points([startPos.x, startPos.y, pos.x, pos.y]);
                    }
                    break;
                    
                case 'rectangle':
                    if (tempShape) {
                        tempShape.width(pos.x - startPos.x);
                        tempShape.height(pos.y - startPos.y);
                    }
                    break;
                    
                case 'circle':
                    if (tempShape) {
                        const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
                        tempShape.radius(radius);
                    }
                    break;
                    
                case 'arrow':
                    if (tempShape) {
                        tempShape.points([startPos.x, startPos.y, pos.x, pos.y]);
                    }
                    break;
            }
            
            this.layer.batchDraw();
        });

        this.stage.on('mouseup', () => {
            isDrawing = false;
            
            if (tempShape || lastLine) {
                const annotation = {
                    id: Date.now(),
                    type: this.currentTool,
                    page: this.currentPage,
                    color: this.currentColor,
                    strokeWidth: this.currentStrokeWidth,
                    shape: tempShape || lastLine,
                    timestamp: new Date().toISOString()
                };
                
                this.addAnnotation(annotation);
                tempShape = null;
                lastLine = null;
            }
        });

        // 双击完成多边形
        this.stage.on('dblclick', () => {
            if (this.currentTool === 'polygon') {
                this.finishPolygon();
            }
        });
    }

    setTool(tool) {
        // 移除所有工具的active状态
        document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));
        
        // 设置当前工具
        this.currentTool = tool;
        document.getElementById(tool + 'Tool').classList.add('active');
        
        // 取消当前操作
        this.cancelCurrentOperation();
        
        // 更新鼠标样式
        if (this.stage) {
            this.stage.container().style.cursor = tool === 'select' ? 'default' : 'crosshair';
        }
    }

    createTextAnnotation(pos) {
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.placeholder = '输入文本...';
        textInput.style.position = 'absolute';
        textInput.style.left = pos.x + 'px';
        textInput.style.top = pos.y + 'px';
        textInput.style.fontSize = '16px';
        textInput.style.border = '1px solid #ccc';
        textInput.style.padding = '4px';
        textInput.style.zIndex = '1001';
        
        this.stage.container().appendChild(textInput);
        textInput.focus();
        
        const finishText = () => {
            const text = textInput.value.trim();
            if (text) {
                const textNode = new Konva.Text({
                    x: pos.x,
                    y: pos.y,
                    text: text,
                    fontSize: 16,
                    fill: this.currentColor,
                    fontFamily: 'Arial',
                });
                
                this.layer.add(textNode);
                this.layer.draw();
                
                const annotation = {
                    id: Date.now(),
                    type: 'text',
                    page: this.currentPage,
                    color: this.currentColor,
                    text: text,
                    shape: textNode,
                    timestamp: new Date().toISOString()
                };
                
                this.addAnnotation(annotation);
            }
            
            textInput.remove();
            this.textInputActive = false;
        };
        
        textInput.addEventListener('blur', finishText);
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                finishText();
            }
        });
        
        this.textInputActive = true;
    }

    addPolygonPoint(pos) {
        this.polygonPoints.push(pos.x, pos.y);
        
        // 绘制临时点
        const point = new Konva.Circle({
            x: pos.x,
            y: pos.y,
            radius: 3,
            fill: this.currentColor,
        });
        
        this.layer.add(point);
        this.layer.draw();
        
        // 如果有多个点，绘制临时线条
        if (this.polygonPoints.length > 2) {
            const line = new Konva.Line({
                points: this.polygonPoints,
                stroke: this.currentColor,
                strokeWidth: this.currentStrokeWidth,
                closed: false,
            });
            
            this.layer.add(line);
            this.layer.draw();
        }
    }

    finishPolygon() {
        if (this.polygonPoints.length >= 6) { // 至少3个点
            // 清除临时图形
            this.layer.destroyChildren();
            
            const polygon = new Konva.Line({
                points: this.polygonPoints,
                stroke: this.currentColor,
                strokeWidth: this.currentStrokeWidth,
                closed: true,
                fill: 'transparent',
            });
            
            this.layer.add(polygon);
            this.layer.draw();
            
            const annotation = {
                id: Date.now(),
                type: 'polygon',
                page: this.currentPage,
                color: this.currentColor,
                strokeWidth: this.currentStrokeWidth,
                points: [...this.polygonPoints],
                shape: polygon,
                timestamp: new Date().toISOString()
            };
            
            this.addAnnotation(annotation);
        }
        
        this.polygonPoints = [];
    }

    addAnnotation(annotation) {
        if (!this.annotations[this.currentPage]) {
            this.annotations[this.currentPage] = [];
        }
        
        this.annotations[this.currentPage].push(annotation);
        this.updateAnnotationList();
    }

    updateAnnotationList() {
        const container = document.getElementById('annotationItems');
        container.innerHTML = '';
        
        Object.keys(this.annotations).forEach(pageNum => {
            this.annotations[pageNum].forEach(annotation => {
                const item = document.createElement('div');
                item.className = 'annotation-item';
                item.innerHTML = `
                    <div class="annotation-type">${this.getAnnotationTypeName(annotation.type)} - 第${pageNum}页</div>
                    <div class="annotation-content">${this.getAnnotationContent(annotation)}</div>
                `;
                
                item.addEventListener('click', () => {
                    this.goToPage(parseInt(pageNum));
                    this.highlightAnnotation(annotation);
                });
                
                container.appendChild(item);
            });
        });
    }

    getAnnotationTypeName(type) {
        const names = {
            'ink': '手绘',
            'text': '文本',
            'highlight': '高亮',
            'underline': '下划线',
            'polygon': '多边形',
            'rectangle': '矩形',
            'circle': '圆形',
            'arrow': '箭头'
        };
        return names[type] || type;
    }

    getAnnotationContent(annotation) {
        switch (annotation.type) {
            case 'text':
                return annotation.text;
            case 'ink':
                return '手绘线条';
            case 'highlight':
                return '高亮区域';
            case 'underline':
                return '下划线';
            case 'polygon':
                return '多边形区域';
            case 'rectangle':
                return '矩形区域';
            case 'circle':
                return '圆形区域';
            case 'arrow':
                return '箭头';
            default:
                return '标注';
        }
    }

    highlightAnnotation(annotation) {
        // 临时高亮显示选中的标注
        if (annotation.shape) {
            const originalStroke = annotation.shape.stroke();
            const originalFill = annotation.shape.fill();
            
            annotation.shape.stroke('#ff0000');
            annotation.shape.fill('rgba(255, 0, 0, 0.1)');
            this.layer.draw();
            
            setTimeout(() => {
                annotation.shape.stroke(originalStroke);
                annotation.shape.fill(originalFill);
                this.layer.draw();
            }, 1000);
        }
    }

    loadPageAnnotations(pageNum) {
        if (!this.layer) return;
        
        // 清除当前图层
        this.layer.destroyChildren();
        
        // 加载该页面的标注
        if (this.annotations[pageNum]) {
            this.annotations[pageNum].forEach(annotation => {
                this.recreateAnnotationShape(annotation);
            });
            this.layer.draw();
        }
    }

    recreateAnnotationShape(annotation) {
        let shape;
        
        switch (annotation.type) {
            case 'ink':
                shape = new Konva.Line({
                    points: annotation.shape.points(),
                    stroke: annotation.color,
                    strokeWidth: annotation.strokeWidth,
                    lineCap: 'round',
                    lineJoin: 'round',
                });
                break;
                
            case 'text':
                shape = new Konva.Text({
                    x: annotation.shape.x(),
                    y: annotation.shape.y(),
                    text: annotation.text,
                    fontSize: 16,
                    fill: annotation.color,
                    fontFamily: 'Arial',
                });
                break;
                
            case 'highlight':
                shape = new Konva.Rect({
                    x: annotation.shape.x(),
                    y: annotation.shape.y(),
                    width: annotation.shape.width(),
                    height: annotation.shape.height(),
                    fill: annotation.color,
                    opacity: 0.3,
                });
                break;
                
            case 'underline':
                shape = new Konva.Line({
                    points: annotation.shape.points(),
                    stroke: annotation.color,
                    strokeWidth: annotation.strokeWidth,
                });
                break;
                
            case 'rectangle':
                shape = new Konva.Rect({
                    x: annotation.shape.x(),
                    y: annotation.shape.y(),
                    width: annotation.shape.width(),
                    height: annotation.shape.height(),
                    stroke: annotation.color,
                    strokeWidth: annotation.strokeWidth,
                    fill: 'transparent',
                });
                break;
                
            case 'circle':
                shape = new Konva.Circle({
                    x: annotation.shape.x(),
                    y: annotation.shape.y(),
                    radius: annotation.shape.radius(),
                    stroke: annotation.color,
                    strokeWidth: annotation.strokeWidth,
                    fill: 'transparent',
                });
                break;
                
            case 'polygon':
                shape = new Konva.Line({
                    points: annotation.points,
                    stroke: annotation.color,
                    strokeWidth: annotation.strokeWidth,
                    closed: true,
                    fill: 'transparent',
                });
                break;
                
            case 'arrow':
                shape = new Konva.Arrow({
                    points: annotation.shape.points(),
                    pointerLength: 10,
                    pointerWidth: 10,
                    fill: annotation.color,
                    stroke: annotation.color,
                    strokeWidth: annotation.strokeWidth,
                });
                break;
        }
        
        if (shape) {
            annotation.shape = shape;
            this.layer.add(shape);
        }
    }

    cancelCurrentOperation() {
        if (this.polygonPoints.length > 0) {
            this.polygonPoints = [];
            this.layer.destroyChildren();
            this.loadPageAnnotations(this.currentPage);
        }
    }

    // 页面导航
    goToPrevPage() {
        if (this.currentPage > 1) {
            this.goToPage(this.currentPage - 1);
        }
    }

    goToNextPage() {
        if (this.currentPage < this.totalPages) {
            this.goToPage(this.currentPage + 1);
        }
    }

    async goToPage(pageNum) {
        if (pageNum >= 1 && pageNum <= this.totalPages) {
            await this.renderPage(pageNum);
        }
    }

    // 缩放功能
    zoomIn() {
        this.scale *= 1.2;
        this.renderPage(this.currentPage);
        this.updateZoomDisplay();
    }

    zoomOut() {
        this.scale /= 1.2;
        this.renderPage(this.currentPage);
        this.updateZoomDisplay();
    }

    fitToPage() {
        const container = document.getElementById('viewerContainer');
        const containerWidth = container.clientWidth - 40; // 减去padding
        const containerHeight = container.clientHeight - 40;
        
        if (this.pdfDoc) {
            this.pdfDoc.getPage(this.currentPage).then(page => {
                const viewport = page.getViewport({ scale: 1.0 });
                const scaleX = containerWidth / viewport.width;
                const scaleY = containerHeight / viewport.height;
                this.scale = Math.min(scaleX, scaleY);
                this.renderPage(this.currentPage);
                this.updateZoomDisplay();
            });
        }
    }

    updateZoomDisplay() {
        document.getElementById('zoomLevel').textContent = Math.round(this.scale * 100) + '%';
    }

    // 标注管理
    clearAllAnnotations() {
        if (confirm('确定要清除所有标注吗？')) {
            this.annotations = {};
            if (this.layer) {
                this.layer.destroyChildren();
                this.layer.draw();
            }
            this.updateAnnotationList();
        }
    }

    saveAnnotations() {
        const data = {
            annotations: this.annotations,
            timestamp: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pdf-annotations.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    loadAnnotations() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        this.annotations = data.annotations || {};
                        this.loadPageAnnotations(this.currentPage);
                        this.updateAnnotationList();
                        alert('标注加载成功！');
                    } catch (error) {
                        alert('标注文件格式错误！');
                    }
                };
                reader.readAsText(file);
            }
        };
        
        input.click();
    }

    toggleAnnotationList() {
        const panel = document.getElementById('annotationListPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    }
}

// 初始化应用
document.addEventListener('DOMContentLoaded', () => {
    new PDFAnnotationTool();
});