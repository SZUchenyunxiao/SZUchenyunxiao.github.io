#!/usr/bin/env bash
# 一键启动个人作品集网站
# 用法：双击本文件，或在终端运行 ./启动网站.sh

# 切换到脚本所在目录（无论从哪里运行都能定位到项目）
cd "$(dirname "$0")" || exit 1

echo "=============================="
echo "  启动 Chen Yunxiao 作品集网站"
echo "=============================="
echo ""

# 加载 nvm 并使用 Node 22
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm use 22 >/dev/null 2>&1 || nvm use default >/dev/null 2>&1
else
  echo "⚠ 没找到 nvm，请先安装 Node.js"
  read -r -p "按回车键退出..."
  exit 1
fi

# 如果还没装依赖，自动安装
if [ ! -d "node_modules" ]; then
  echo "首次运行，正在安装依赖（可能需要几分钟）..."
  npm install --legacy-peer-deps --registry=https://registry.npmmirror.com
  echo ""
fi

echo "✓ 正在启动开发服务器..."
echo "✓ 启动后浏览器会自动打开 http://localhost:5173/"
echo "✓ 想停止网站：在这个窗口按 Ctrl + C"
echo ""

# 3 秒后自动打开浏览器（后台执行，不阻塞服务器启动）
( sleep 3; xdg-open http://localhost:5173/ >/dev/null 2>&1 ) &

# 启动 Vite 开发服务器
npm run dev
