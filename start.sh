#!/bin/bash

# 环信发送前回调服务启动脚本

set -e

echo "🚀 启动环信发送前回调服务..."

# 检查 Node.js 版本
if ! command -v node &> /dev/null; then
    echo "❌ Node.js 未安装，请先安装 Node.js 16+ 版本"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js 版本过低，需要 16+ 版本，当前版本: $(node -v)"
    exit 1
fi

echo "✅ Node.js 版本检查通过: $(node -v)"

# 检查环境变量文件
if [ ! -f .env ]; then
    echo "⚠️  未找到 .env 文件，正在从 env.example 创建..."
    cp env.example .env
    echo "📝 请编辑 .env 文件配置环信密钥"
fi

# 安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 安装项目依赖..."
    npm install
else
    echo "✅ 依赖已安装"
fi

# 创建日志目录
mkdir -p logs

# 检查环境变量
if [ -z "$EASEMOB_SECRET" ]; then
    echo "⚠️  环境变量 EASEMOB_SECRET 未设置"
    echo "📝 请在 .env 文件中设置 EASEMOB_SECRET"
fi

# 运行测试
echo "🧪 运行测试..."
npm test

echo "✅ 测试通过"

# 启动服务
echo "🚀 启动服务..."
if [ "$NODE_ENV" = "development" ]; then
    echo "🔧 开发模式启动"
    npm run dev
else
    echo "🏭 生产模式启动"
    npm start
fi
