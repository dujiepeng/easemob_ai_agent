# GitHub Actions 自动部署配置指南

本项目配置了 GitHub Actions 自动部署，当代码推送到 `dev` 分支时会自动部署到服务器。

## 配置 GitHub Secrets

在 GitHub 仓库中配置以下 Secrets：

### 访问仓库设置
1. 进入仓库页面
2. 点击 `Settings` (设置)
3. 在左侧菜单中找到 `Secrets and variables` → `Actions`
4. 点击 `New repository secret` 添加新的 Secret

### 必需的 Secrets

#### 1. SSH_HOST
- **名称**: `SSH_HOST`
- **描述**: 服务器 IP 地址或域名
- **示例**: `192.168.1.100` 或 `deploy.example.com`

#### 2. SSH_USER
- **名称**: `SSH_USER`
- **描述**: SSH 登录用户名
- **示例**: `root` 或 `ubuntu`

#### 3. SSH_PASSWORD
- **名称**: `SSH_PASSWORD`
- **描述**: SSH 登录密码
- **示例**: `your_password_here`

### 可选的 Secrets

#### 4. SSH_PORT (可选)
- **名称**: `SSH_PORT`
- **描述**: SSH 端口号（默认: 22）
- **示例**: `2222`

#### 5. SSH_PROJECT_DIR (可选)
- **名称**: `SSH_PROJECT_DIR`
- **描述**: 服务器上项目部署目录的绝对路径（默认: `$HOME/easemob_ai_agent`，与 `install.sh` 中的 `DEFAULT_INSTALL_DIR` 保持一致）
- **示例**: `/var/www/easemob_ai_agent` 或 `/home/ubuntu/easemob_ai_agent`

#### 6. SSH_DEPLOY_TYPE (可选)
- **名称**: `SSH_DEPLOY_TYPE`
- **描述**: 部署方式，可选值: `local` 或 `docker`（默认: `local`）
- **示例**: `docker` 或 `local`

### 使用 SSH 密钥认证（推荐，更安全）

如果不想使用密码，可以使用 SSH 密钥认证：

1. **生成 SSH 密钥对**（如果还没有）
   ```bash
   ssh-keygen -t rsa -b 4096 -C "github-actions"
   ```

2. **将公钥添加到服务器**
   ```bash
   ssh-copy-id -i ~/.ssh/id_rsa.pub user@server
   ```
   或手动复制公钥内容到服务器的 `~/.ssh/authorized_keys` 文件

3. **在 GitHub Secrets 中配置**

   - **SSH_PRIVATE_KEY**
     - **名称**: `SSH_PRIVATE_KEY`
     - **描述**: SSH 私钥内容（完整内容，包括 `-----BEGIN ... -----END ...`）
     - **获取方式**: `cat ~/.ssh/id_rsa`
   
   - **SSH_PASSPHRASE** (可选，如果密钥设置了密码)
     - **名称**: `SSH_PASSPHRASE`
     - **描述**: SSH 密钥的密码（如果设置了）

4. **修改 workflow 文件**
   
   在 `.github/workflows/deploy.yml` 中：
   - 注释掉 `password: ${{ secrets.SSH_PASSWORD }}`
   - 取消注释 `key: ${{ secrets.SSH_PRIVATE_KEY }}`
   - 如果密钥有密码，取消注释 `passphrase: ${{ secrets.SSH_PASSPHRASE }}`

## 部署流程

1. **触发条件**: 当代码推送到 `dev` 分支时自动触发
2. **部署步骤**:
   - GitHub Actions 检出代码
   - 通过 SSH 连接到服务器
   - 更新代码（首次会自动克隆）
   - 根据部署方式执行部署：
     - **本地部署**: 安装 npm 依赖，重启 Node.js 服务
     - **Docker 部署**: 重新构建镜像，重启容器
   - 执行健康检查

## 服务器要求

### 本地部署方式
- Node.js >= 16.0.0
- npm
- Git

### Docker 部署方式
- Docker
- Docker Compose

### 通用要求
- SSH 访问权限
- 服务器上需要配置 `.env` 文件（首次部署会自动从 `env.example` 复制）

## 查看部署状态

1. 进入仓库页面
2. 点击 `Actions` 标签
3. 查看最新的 workflow 运行状态
4. 点击具体的运行查看详细日志

## 故障排查

### 部署失败
1. 检查 GitHub Secrets 配置是否正确
2. 检查服务器 SSH 连接是否正常
3. 查看 Actions 日志中的错误信息
4. 检查服务器上的 `.env` 文件配置

### 服务无法启动
1. 检查服务器日志: `tail -f ~/easemob_ai_agent/logs/app.log`
2. 检查端口是否被占用
3. 检查 Node.js/Docker 环境是否正常

### 健康检查失败
1. 检查服务是否正在运行: `ps aux | grep node` 或 `docker ps`
2. 检查防火墙设置
3. 手动访问健康检查接口: `curl http://localhost:3000/health`

## 手动触发部署

如果需要手动触发部署，可以：

1. **推送空提交到 dev 分支**
   ```bash
   git commit --allow-empty -m "Trigger deployment"
   git push origin dev
   ```

2. **或者通过 GitHub UI**
   - 进入 Actions 页面
   - 选择 "Deploy to Server" workflow
   - 点击 "Run workflow"

## 注意事项

1. **`.env` 文件**: 首次部署会自动创建，但需要手动配置 `EASEMOB_SECRET` 等敏感信息
2. **代码更新**: 每次部署会拉取最新的 `dev` 分支代码，请确保代码已提交并推送
3. **服务重启**: 部署过程会停止现有服务并重新启动，有短暂的服务中断
4. **备份**: 建议在重要更新前备份服务器上的数据和配置

