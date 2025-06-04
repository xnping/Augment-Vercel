/**
 * 生成临时邮箱 API
 * POST /api/email/generate
 */

import { Redis } from '@upstash/redis';
import { verifyCredentials } from '../auth.js';

const redis = Redis.fromEnv();

// 生成随机邮箱地址
function generateEmailAddress() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `temp-${timestamp}-${random}@temp.weidadaa.com`;
}

// CORS 头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    // 验证用户身份（复用现有认证逻辑）
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password required'
      });
    }

    // 调用现有的认证函数
    const authResult = await verifyCredentials(username, password);
    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }

    // 生成临时邮箱
    const emailAddress = generateEmailAddress();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24小时后过期
    
    const emailData = {
      email: emailAddress,
      username: username,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      messageCount: 0,
      isActive: true
    };

    // 存储到 Upstash Redis，设置 TTL 为 24 小时
    await redis.set(`email:${emailAddress}`, JSON.stringify(emailData), { ex: 24 * 60 * 60 });

    // 记录用户的邮箱列表
    const userEmailsKey = `user:${username}:emails`;
    const userEmails = await redis.get(userEmailsKey) || [];
    const emailList = Array.isArray(userEmails) ? userEmails : (userEmails ? JSON.parse(userEmails) : []);
    emailList.push(emailAddress);
    await redis.set(userEmailsKey, JSON.stringify(emailList), { ex: 24 * 60 * 60 });

    res.status(200).json({
      success: true,
      email: emailAddress,
      expiresAt: expiresAt.toISOString(),
      message: 'Temporary email generated successfully'
    });

  } catch (error) {
    console.error('Generate email error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
