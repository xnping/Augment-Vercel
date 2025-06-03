// api/auth.js - 账号密码验证接口
import crypto from 'crypto';

// 预设账号密码哈希值（从环境变量读取）
function getValidAccounts() {
  return {
    'user1': process.env.USER1_PASSWORD_HASH || '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // hello
    'user2': process.env.USER2_PASSWORD_HASH || 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', // secret
    'admin': process.env.ADMIN_PASSWORD_HASH || '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'  // admin123
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
