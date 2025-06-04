// api/auth.js - 账号密码验证接口
// 简化版本 - 从JSON数据读取账号密码
import fs from 'fs';
import path from 'path';

// 数据文件路径
const DATA_FILE = path.join(process.cwd(), 'data', 'accounts.json');

// 读取账号数据并直接比较
function isValidCredentials(username, password) {
  console.log(`[DEBUG] 验证凭据: username=${username}, password=${password}`);
  console.log(`[DEBUG] 数据文件路径: ${DATA_FILE}`);
  console.log(`[DEBUG] 文件是否存在: ${fs.existsSync(DATA_FILE)}`);

  try {
    // 先尝试从文件读取
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const accountsData = JSON.parse(data);
      console.log(`[DEBUG] 从文件读取到账号数据:`, accountsData);

      // 遍历账号数据，直接比较用户名和密码
      for (const account of Object.values(accountsData.accounts)) {
        console.log(`[DEBUG] 检查账号:`, account);
        if (account.enabled && account.username === username && account.password === password) {
          console.log(`[DEBUG] 文件验证成功`);
          return true;
        }
      }
      console.log(`[DEBUG] 文件中未找到匹配账号`);
    } else {
      console.log(`[DEBUG] 文件不存在，使用默认验证`);
    }
  } catch (error) {
    console.error('[DEBUG] 读取账号文件失败:', error);
  }

  // 如果文件读取失败，使用默认账号
  const defaultResult = username === 'admin' && password === 'admin123';
  console.log(`[DEBUG] 默认验证结果: ${defaultResult}`);
  return defaultResult;
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
export function verifyCredentials(username, password) {
  // 简化验证，直接返回结果
  if (isValidCredentials(username, password)) {
    return {
      success: true,
      username: username,
      timestamp: Math.floor(Date.now() / 1000)
    };
  } else {
    return {
      success: false,
      error: 'Invalid credentials'
    };
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

  if (isValidCredentials(username, password)) {
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
