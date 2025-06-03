# 🚀 Vercel 部署指南

本指南将帮助您快速部署 Augment 清理工具的远程控制服务到 Vercel。

## 📋 准备工作

### 1. 账号准备
- [GitHub 账号](https://github.com)
- [Vercel 账号](https://vercel.com)（可用 GitHub 登录）

### 2. 工具准备
- Git（用于代码管理）
- Node.js（可选，用于本地测试）

## 🛠️ 部署步骤

### 第一步：创建 GitHub 仓库

1. **登录 GitHub**，创建新仓库
   - 仓库名：`augment-switch-control`（或您喜欢的名字）
   - 设置为 Public（公开）
   - 勾选 "Add a README file"

2. **克隆仓库到本地**
   ```bash
   git clone https://github.com/yourusername/augment-switch-control.git
   cd augment-switch-control
   ```

3. **复制项目文件**
   - 将 `switch-control` 目录下的所有文件复制到仓库根目录
   - 确保包含：`api/`、`public/`、`vercel.json`、`package.json` 等

4. **提交代码**
   ```bash
   git add .
   git commit -m "Initial commit: Augment switch control service"
   git push origin main
   ```

### 第二步：部署到 Vercel

1. **登录 Vercel**
   - 访问 [vercel.com](https://vercel.com)
   - 点击 "Continue with GitHub" 登录

2. **导入项目**
   - 点击 "New Project"
   - 选择您刚创建的 `augment-switch-control` 仓库
   - 点击 "Import"

3. **配置项目**
   - Project Name: 保持默认或修改
   - Framework Preset: 选择 "Other"
   - Root Directory: 保持默认 "./"
   - 点击 "Deploy"

4. **等待部署完成**
   - 首次部署通常需要 1-2 分钟
   - 部署成功后会显示项目地址，如：`https://your-project.vercel.app`

### 第三步：配置环境变量

1. **进入项目设置**
   - 在 Vercel 控制台中，点击您的项目
   - 点击 "Settings" 标签
   - 选择 "Environment Variables"

2. **添加必要的环境变量**

   | 变量名 | 值 | 说明 |
   |--------|----|----- |
   | `SERVICE_ENABLED` | `true` | 服务开关 |
   | `SERVICE_VERSION` | `1.0.0` | 版本号 |
   | `SERVICE_NOTICE` | `` | 通知消息（可为空） |
   | `PASSWORD_SALT` | `augment_salt_2024` | 密码盐值 |

3. **添加用户密码哈希**

   首先生成密码哈希：
   ```bash
   # 在 switch-control 目录下运行
   node scripts/generate-hash.js
   ```
   
   然后添加环境变量：
   | 变量名 | 值 | 说明 |
   |--------|----|----- |
   | `USER1_PASSWORD_HASH` | `生成的哈希值` | 用户1密码 |
   | `USER2_PASSWORD_HASH` | `生成的哈希值` | 用户2密码 |
   | `ADMIN_PASSWORD_HASH` | `生成的哈希值` | 管理员密码 |

4. **保存配置**
   - 点击 "Save" 保存每个环境变量
   - 保存后会自动重新部署

### 第四步：测试部署

1. **测试 API 接口**
   ```bash
   # 测试状态接口
   curl https://your-project.vercel.app/api/status
   
   # 应该返回类似：
   # {"enabled":true,"message":"服务正常运行","version":"1.0.0",...}
   ```

2. **测试管理界面**
   - 访问：`https://your-project.vercel.app/admin.html`
   - 应该看到服务控制台界面

3. **测试身份验证**
   ```bash
   curl -X POST https://your-project.vercel.app/api/auth \
     -H "Content-Type: application/json" \
     -d '{"username":"user1","password":"your_password"}'
   ```

## ⚙️ 客户端配置

### 更新配置文件

编辑客户端的 `config.py` 文件：

```python
# 将此地址替换为您的 Vercel 项目地址
VERCEL_SERVICE_URL = "https://your-project.vercel.app"
```

### 测试连接

运行客户端程序测试连接：
```bash
python -c "from augutils.vercel_auth import test_connection; test_connection()"
```

## 🎛️ 服务控制

### 启用/禁用服务

1. **通过 Vercel 控制台**
   - 进入项目设置 → Environment Variables
   - 修改 `SERVICE_ENABLED` 为 `true`（启用）或 `false`（禁用）
   - 保存后立即生效

2. **通过管理界面**
   - 访问 `https://your-project.vercel.app/admin.html`
   - 查看当前状态和控制指引

### 发送通知消息

1. 修改 `SERVICE_NOTICE` 环境变量
2. 设置要显示给用户的消息内容
3. 保存后用户端会显示通知

### 查看访问日志

1. 在 Vercel 控制台点击 "Functions" 标签
2. 选择相应的函数查看日志
3. 可以看到用户访问和登录记录

## 🔧 高级配置

### 自定义域名（可选）

1. 在 Vercel 项目设置中点击 "Domains"
2. 添加您的自定义域名
3. 按照提示配置 DNS 记录

### 启用详细日志

设置环境变量：
```
LOG_REQUESTS = true
```

### 添加更多用户

1. 生成新用户的密码哈希
2. 添加新的环境变量：`USER3_PASSWORD_HASH`、`USER4_PASSWORD_HASH` 等
3. 更新 `api/auth.js` 中的用户列表

## 🛡️ 安全建议

1. **定期更换密码**
   - 生成新的密码哈希
   - 更新环境变量

2. **监控访问日志**
   - 定期检查异常访问
   - 关注失败的登录尝试

3. **备份配置**
   - 记录所有环境变量
   - 保存项目配置

## 🆘 故障排除

### 常见问题

1. **部署失败**
   ```
   解决方案：
   - 检查 vercel.json 格式
   - 确保所有文件已提交
   - 查看部署日志
   ```

2. **API 返回 500 错误**
   ```
   解决方案：
   - 检查环境变量是否正确设置
   - 查看函数日志
   - 确认代码语法正确
   ```

3. **客户端连接失败**
   ```
   解决方案：
   - 确认服务地址正确
   - 检查网络连接
   - 测试 API 接口
   ```

### 调试方法

1. **查看 Vercel 日志**
   - Functions 标签页查看函数执行日志
   - Deployments 标签页查看部署日志

2. **本地测试**
   ```bash
   # 安装 Vercel CLI
   npm i -g vercel
   
   # 本地运行
   vercel dev
   ```

3. **API 测试工具**
   - 使用 Postman 或 curl 测试 API
   - 检查请求和响应格式

## 📞 技术支持

如果遇到问题：

1. 检查本指南的故障排除部分
2. 查看 Vercel 官方文档
3. 检查项目的 GitHub Issues

---

🎉 **恭喜！** 您已成功部署 Augment 清理工具的远程控制服务！
