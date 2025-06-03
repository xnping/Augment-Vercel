# Augment 清理工具 - 远程控制服务

这是一个基于 Vercel Functions 的远程控制服务，用于管理 Augment 清理工具的访问权限。

## 功能特性

- ✅ **账号密码验证**：支持多用户登录验证
- 🎛️ **远程开关控制**：可随时启用/禁用服务
- 📢 **通知系统**：向用户推送重要消息
- 🔒 **安全防护**：速率限制、密码加盐等安全措施
- 📊 **访问日志**：记录用户访问和登录情况
- 🌐 **全球部署**：基于 Vercel 的全球 CDN

## 快速部署

### 1. 准备工作

确保您有以下账号：
- GitHub 账号
- Vercel 账号（可用 GitHub 登录）

### 2. 部署步骤

1. **创建 GitHub 仓库**
   ```bash
   # 在 GitHub 上创建新仓库，然后克隆
   git clone https://github.com/yourusername/switch-control.git
   cd switch-control
   
   # 将本项目文件复制到仓库中
   # 提交代码
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **连接 Vercel**
   - 访问 [vercel.com](https://vercel.com)
   - 用 GitHub 账号登录
   - 点击 "New Project"
   - 选择您的 `switch-control` 仓库
   - 点击 "Deploy"

3. **配置环境变量**
   
   在 Vercel 项目设置中添加以下环境变量：
   
   | 变量名 | 值 | 说明 |
   |--------|----|----- |
   | `SERVICE_ENABLED` | `true` | 服务开关（true/false） |
   | `SERVICE_VERSION` | `1.0.0` | 服务版本号 |
   | `SERVICE_NOTICE` | `` | 通知消息（可为空） |
   | `LOG_REQUESTS` | `false` | 是否记录详细日志 |
   | `PASSWORD_SALT` | `your_salt_here` | 密码加盐字符串 |
   | `USER1_PASSWORD_HASH` | `hash_value` | 用户1密码哈希 |
   | `USER2_PASSWORD_HASH` | `hash_value` | 用户2密码哈希 |
   | `ADMIN_PASSWORD_HASH` | `hash_value` | 管理员密码哈希 |

### 3. 生成密码哈希

使用以下 Node.js 代码生成密码哈希：

```javascript
const crypto = require('crypto');

function hashPassword(password, salt = 'augment_salt_2024') {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// 示例
console.log('hello:', hashPassword('hello'));
console.log('secret:', hashPassword('secret'));
console.log('admin123:', hashPassword('admin123'));
```

## API 接口

### 1. 状态检查接口

```
GET https://your-project.vercel.app/api/status
```

**响应示例：**
```json
{
  "enabled": true,
  "message": "服务正常运行",
  "version": "1.0.0",
  "notice": "",
  "timestamp": 1703123456,
  "server_time": "2023-12-21T03:17:36.000Z"
}
```

### 2. 身份验证接口

```
POST https://your-project.vercel.app/api/auth
Content-Type: application/json

{
  "username": "user1",
  "password": "hello"
}
```

**成功响应：**
```json
{
  "success": true,
  "message": "验证成功",
  "username": "user1",
  "timestamp": 1703123456
}
```

**失败响应：**
```json
{
  "success": false,
  "message": "用户名或密码错误"
}
```

## 管理界面

访问 `https://your-project.vercel.app/admin.html` 查看管理界面。

管理界面提供：
- 📊 实时服务状态监控
- 🎛️ 控制操作指引
- 📢 通知消息管理
- 🔄 状态自动刷新

## 控制方法

### 启用/禁用服务

1. 登录 [Vercel 控制台](https://vercel.com)
2. 进入项目设置 → Environment Variables
3. 修改 `SERVICE_ENABLED` 为 `true`（启用）或 `false`（禁用）
4. 保存后立即生效

### 更新通知消息

1. 修改 `SERVICE_NOTICE` 环境变量
2. 设置要显示的通知内容
3. 保存后用户端会显示通知

### 查看访问日志

在 Vercel 控制台的 Functions 标签页可以查看详细的访问日志。

## 安全特性

- 🔐 **密码加盐**：防止彩虹表攻击
- 🚫 **速率限制**：防止暴力破解（15分钟内最多5次尝试）
- 📝 **访问日志**：记录所有访问和登录尝试
- 🌐 **CORS 配置**：安全的跨域访问控制
- ⏰ **时间戳验证**：防止重放攻击

## 故障排除

### 常见问题

1. **部署失败**
   - 检查 `package.json` 和 `vercel.json` 格式
   - 确保所有文件都已提交到 Git

2. **环境变量不生效**
   - 确保在 Vercel 控制台正确设置
   - 重新部署项目

3. **API 访问失败**
   - 检查 CORS 设置
   - 确认 API 地址正确

4. **密码验证失败**
   - 确认密码哈希值正确
   - 检查盐值是否一致

### 调试方法

1. 查看 Vercel 函数日志
2. 使用浏览器开发者工具检查网络请求
3. 测试 API 接口响应

## 成本说明

Vercel 免费计划包含：
- ✅ 100GB 带宽/月
- ✅ 100,000 次函数调用/月
- ✅ 无限静态文件托管
- ✅ 全球 CDN

对于个人使用完全免费！

## 技术支持

如有问题，请检查：
1. Vercel 控制台的函数日志
2. 浏览器控制台的错误信息
3. 网络连接状态

---

**注意**：请妥善保管您的 Vercel 账号和项目访问权限，避免未授权访问。
