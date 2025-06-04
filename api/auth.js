// api/auth.js - 账号密码验证接口
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// 数据文件路径
const DATA_FILE = path.join(process.cwd(), 'data', 'accounts.json');

// 读取账号数据
function getValidAccounts() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const accountsData = JSON.parse(data);

      // 转换为旧格式以兼容现有代码
      const accounts = {};
      Object.values(accountsData.accounts).forEach(account => {
        if (account.enabled) {
          accounts[account.username] = account.passwordHash;
        }
      });

      return accounts;
    }
  } catch (error) {
    console.error('读取账号文件失败，使用环境变量:', error);
  }

  // 如果文件不存在或读取失败，回退到环境变量
  return {
    'user1': process.env.USER1_PASSWORD_HASH || '85786b7aece20433efcc965b6ec78fef9a1f5721d8004d865438b0d5854232a7', // hello
    'user2': process.env.USER2_PASSWORD_HASH || '7fc3617b3d537a4030922cf9eafcc9d212798c9edd352e713042eb6c04fa002a', // password
    'admin': process.env.ADMIN_PASSWORD_HASH || '228d40e2fd54baf63d2a88260d0a903d031f274485439c397c43f6db1e1b1755'  // admin123
  };
}

function hashPassword(password) {
  const salt = process.env.PASSWORD_SALT || 'augment_salt_2024';
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

// 简单的速率限制（内存存储，重启后重置）
const rateLimitMap = new Map();
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15分钟

function checkRateLimit(ip) {
  const now = Date.now();
  const attempts = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  
  if (now > attempts.resetTime) {
    // 重置计数器
    attempts.count = 0;
    attempts.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  if (attempts.count >= MAX_ATTEMPTS) {
    return false; // 超过限制
  }
  
  return true;
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const attempts = rateLimitMap.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  attempts.count++;
  rateLimitMap.set(ip, attempts);
}

// 更新最后登录时间
function updateLastLoginTime(username) {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const accountsData = JSON.parse(data);

      if (accountsData.accounts[username]) {
        accountsData.accounts[username].lastLogin = new Date().toISOString();
        fs.writeFileSync(DATA_FILE, JSON.stringify(accountsData, null, 2));
      }
    }
  } catch (error) {
    console.error('更新登录时间失败:', error);
  }
}

// 导出验证函数供其他模块使用
export async function verifyCredentials(username, password) {
  try {
    // 验证输入
    if (!username || !password) {
      return { success: false, error: 'Username and password required' };
    }

    // 验证用户名格式
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return { success: false, error: 'Invalid username format' };
    }

    const validAccounts = getValidAccounts();
    const passwordHash = hashPassword(password);

    if (validAccounts[username] && validAccounts[username] === passwordHash) {
      // 更新最后登录时间
      updateLastLoginTime(username);

      return {
        success: true,
        username: username,
        timestamp: Math.floor(Date.now() / 1000)
      };
    } else {
      return { success: false, error: 'Invalid credentials' };
    }
  } catch (error) {
    console.error('Verify credentials error:', error);
    return { success: false, error: 'Internal server error' };
  }
}

export default function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  // 获取客户端IP
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress || 
                   'unknown';

  // 检查速率限制
  if (!checkRateLimit(clientIP)) {
    console.log(`[${new Date().toISOString()}] Rate limit exceeded for ${clientIP}`);
    return res.status(429).json({
      success: false,
      message: '尝试次数过多，请15分钟后再试'
    });
  }

  const { username, password } = req.body;

  // 验证输入
  if (!username || !password) {
    return res.status(400).json({ 
      success: false, 
      message: '用户名和密码不能为空' 
    });
  }

  // 验证用户名格式（简单验证）
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({
      success: false,
      message: '用户名格式不正确'
    });
  }

  const validAccounts = getValidAccounts();
  const passwordHash = hashPassword(password);
  
  if (validAccounts[username] && validAccounts[username] === passwordHash) {
    // 验证成功
    console.log(`[${new Date().toISOString()}] Successful login: ${username} from ${clientIP}`);

    // 更新最后登录时间
    updateLastLoginTime(username);

    res.status(200).json({
      success: true,
      message: '验证成功',
      username: username,
      timestamp: Math.floor(Date.now() / 1000)
    });
  } else {
    // 验证失败
    recordFailedAttempt(clientIP);
    console.log(`[${new Date().toISOString()}] Failed login attempt: ${username} from ${clientIP}`);
    
    res.status(401).json({
      success: false,
      message: '用户名或密码错误'
    });
  }
}
