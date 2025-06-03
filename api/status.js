// api/status.js - 主要的状态检查接口
export default function handler(req, res) {
  // 设置 CORS 头，允许跨域访问
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 从环境变量读取配置
  const config = {
    enabled: process.env.SERVICE_ENABLED === 'true',
    message: process.env.SERVICE_ENABLED === 'true' ? '服务正常运行' : '服务已暂停',
    version: process.env.SERVICE_VERSION || '1.0.0',
    notice: process.env.SERVICE_NOTICE || '',
    timestamp: Math.floor(Date.now() / 1000),
    server_time: new Date().toISOString()
  };

  // 记录访问日志（可在 Vercel 控制台查看）
  const clientIP = req.headers['x-forwarded-for'] || 
                   req.headers['x-real-ip'] || 
                   req.connection.remoteAddress || 
                   'unknown';
  
  console.log(`[${new Date().toISOString()}] Status check from ${clientIP}`);

  // 可选：添加简单的访问统计
  if (process.env.LOG_REQUESTS === 'true') {
    console.log(`Request details:`, {
      ip: clientIP,
      userAgent: req.headers['user-agent'],
      timestamp: config.timestamp,
      enabled: config.enabled
    });
  }

  // 返回状态信息
  res.status(200).json(config);
}
