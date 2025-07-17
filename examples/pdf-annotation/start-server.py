#!/usr/bin/env python3
"""
PDF 标注工具本地服务器启动脚本
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

# 配置
PORT = 8000
HOST = "localhost"

def start_server():
    """启动HTTP服务器"""
    
    # 切换到项目根目录
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent  # 回到项目根目录
    os.chdir(project_root)
    
    print(f"项目根目录: {project_root}")
    print(f"当前工作目录: {os.getcwd()}")
    
    # 创建HTTP服务器
    Handler = http.server.SimpleHTTPRequestHandler
    
    try:
        with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
            print(f"🚀 服务器已启动")
            print(f"📡 地址: http://{HOST}:{PORT}")
            print(f"📄 PDF标注工具: http://{HOST}:{PORT}/examples/pdf-annotation/index.html")
            print(f"🧪 测试页面: http://{HOST}:{PORT}/examples/pdf-annotation/test.html")
            print(f"⏹️  按 Ctrl+C 停止服务器")
            print("-" * 60)
            
            # 自动打开浏览器
            url = f"http://{HOST}:{PORT}/examples/pdf-annotation/test.html"
            try:
                webbrowser.open(url)
                print(f"🌐 已在浏览器中打开: {url}")
            except Exception as e:
                print(f"⚠️  无法自动打开浏览器: {e}")
                print(f"请手动访问: {url}")
            
            print("-" * 60)
            
            # 启动服务器
            httpd.serve_forever()
            
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ 端口 {PORT} 已被占用")
            print("请尝试以下解决方案：")
            print("1. 关闭占用端口的程序")
            print("2. 修改脚本中的PORT变量使用其他端口")
            print("3. 使用命令: lsof -ti:8000 | xargs kill -9")
        else:
            print(f"❌ 服务器启动失败: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n⏹️  服务器已停止")
        sys.exit(0)

if __name__ == "__main__":
    print("=" * 60)
    print("🔧 PDF 标注工具 - 本地服务器启动器")
    print("=" * 60)
    
    # 检查Python版本
    if sys.version_info < (3, 0):
        print("❌ 需要Python 3.x版本")
        print("请使用: python3 start-server.py")
        sys.exit(1)
    
    start_server()