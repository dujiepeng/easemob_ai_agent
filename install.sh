#!/bin/bash

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# GitHub 仓库地址
GITHUB_REPO="git@github.com:dujiepeng/easemob_ai_agent.git"
# 也可以使用 HTTPS 地址（如果SSH不可用）
# GITHUB_REPO="https://github.com/dujiepeng/easemob_ai_agent.git"

# 默认安装目录
DEFAULT_INSTALL_DIR="$HOME/easemob_ai_agent"
INSTALL_DIR="${1:-$DEFAULT_INSTALL_DIR}"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

# 检查系统依赖
check_dependencies() {
    log_info "检查系统依赖..."
    
    local missing_deps=()
    
    if ! check_command git; then
        missing_deps+=("git")
    fi
    
    if ! check_command docker; then
        missing_deps+=("docker")
    fi
    
    if ! check_command docker-compose; then
        missing_deps+=("docker-compose")
    fi
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "缺少以下依赖: ${missing_deps[*]}"
        log_info "请先安装缺少的依赖："
        if [[ "$OSTYPE" == "linux-gnu"* ]]; then
            log_info "  Ubuntu/Debian: sudo apt-get update && sudo apt-get install -y ${missing_deps[*]} docker.io docker-compose"
            log_info "  或使用 Docker 官方安装脚本: curl -fsSL https://get.docker.com | sh"
        elif [[ "$OSTYPE" == "darwin"* ]]; then
            log_info "  macOS: brew install ${missing_deps[*]}"
            log_info "  Docker Desktop: https://www.docker.com/products/docker-desktop"
        fi
        exit 1
    fi
    
    log_success "所有依赖已安装"
}

# 检查 Docker 服务是否运行
check_docker_running() {
    if ! docker info &> /dev/null; then
        log_error "Docker 服务未运行，请先启动 Docker"
        exit 1
    fi
    log_success "Docker 服务运行正常"
}

# 克隆或更新代码
setup_code() {
    log_info "设置项目代码..."
    
    if [ -d "$INSTALL_DIR" ]; then
        log_warning "目录 $INSTALL_DIR 已存在"
        read -p "是否更新现有代码? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            log_info "更新代码..."
            cd "$INSTALL_DIR"
            git pull || log_warning "更新代码失败，继续使用现有代码"
        fi
    else
        log_info "克隆代码到 $INSTALL_DIR..."
        git clone "$GITHUB_REPO" "$INSTALL_DIR" || {
            log_error "克隆代码失败"
            log_info "如果使用 SSH 失败，请尝试:"
            log_info "  export GITHUB_REPO=https://github.com/dujiepeng/easemob_ai_agent.git"
            log_info "  然后重新运行此脚本"
            exit 1
        }
    fi
    
    log_success "代码设置完成"
}

# 配置环境变量
setup_env() {
    log_info "配置环境变量..."
    
    cd "$INSTALL_DIR"
    ENV_FILE=".env"
    
    if [ ! -f "$ENV_FILE" ]; then
        log_info "创建 .env 文件..."
        cp env.example "$ENV_FILE"
    fi
    
    # 检查 EASEMOB_SECRET 是否已配置
    if ! grep -q "^EASEMOB_SECRET=.*[^=]$" "$ENV_FILE" 2>/dev/null || grep -q "^EASEMOB_SECRET=your_easemob_secret_here" "$ENV_FILE" 2>/dev/null; then
        log_warning "EASEMOB_SECRET 未配置或使用默认值"
        read -p "请输入 EASEMOB_SECRET (直接回车跳过，稍后手动配置): " secret
        if [ -n "$secret" ]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS 使用 sed -i ''
                sed -i '' "s|^EASEMOB_SECRET=.*|EASEMOB_SECRET=$secret|" "$ENV_FILE"
            else
                # Linux 使用 sed -i
                sed -i "s|^EASEMOB_SECRET=.*|EASEMOB_SECRET=$secret|" "$ENV_FILE"
            fi
            log_success "EASEMOB_SECRET 已配置"
        else
            log_warning "请稍后在 $INSTALL_DIR/.env 文件中手动配置 EASEMOB_SECRET"
        fi
    else
        log_success "EASEMOB_SECRET 已配置"
    fi
}

# 构建和启动服务
deploy_service() {
    log_info "部署服务..."
    
    cd "$INSTALL_DIR"
    
    # 停止现有服务（如果存在）
    if docker-compose ps | grep -q easemob-callback; then
        log_info "停止现有服务..."
        docker-compose down
    fi
    
    # 创建必要的目录
    mkdir -p logs data
    
    # 构建并启动服务
    log_info "构建 Docker 镜像..."
    docker-compose build
    
    log_info "启动服务..."
    docker-compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 5
    
    # 检查服务状态
    if docker-compose ps | grep -q "Up"; then
        log_success "服务启动成功！"
        log_info "服务地址: http://localhost:9999"
        log_info "健康检查: http://localhost:9999/health"
        log_info "查看日志: docker-compose -f $INSTALL_DIR/docker-compose.yml logs -f"
        log_info "停止服务: docker-compose -f $INSTALL_DIR/docker-compose.yml down"
    else
        log_error "服务启动失败，请检查日志: docker-compose -f $INSTALL_DIR/docker-compose.yml logs"
        exit 1
    fi
}

# 主函数
main() {
    echo "=========================================="
    echo "  环信回调服务一键部署脚本"
    echo "=========================================="
    echo ""
    log_info "安装目录: $INSTALL_DIR"
    echo ""
    
    check_dependencies
    check_docker_running
    setup_code
    setup_env
    deploy_service
    
    echo ""
    echo "=========================================="
    log_success "部署完成！"
    echo "=========================================="
    echo ""
    log_info "常用命令:"
    echo "  查看日志: cd $INSTALL_DIR && docker-compose logs -f"
    echo "  停止服务: cd $INSTALL_DIR && docker-compose down"
    echo "  启动服务: cd $INSTALL_DIR && docker-compose up -d"
    echo "  重启服务: cd $INSTALL_DIR && docker-compose restart"
    echo ""
}

# 运行主函数
main

