/**
 * 邮箱管理 API
 * GET /api/email/[email] - 获取邮件列表
 * DELETE /api/email/[email] - 删除邮箱
 */

import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

// 数据文件路径
const DATA_FILE = path.join(process.cwd(), 'data', 'accounts.json');

// 验证用户凭据（与主认证API保持一致）
function isValidCredentials(username, password) {
  try {
    // 先尝试从文件读取
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      const accountsData = JSON.parse(data);

      // 遍历账号数据，直接比较用户名和密码
      for (const account of Object.values(accountsData.accounts)) {
        if (account.enabled && account.username === username && account.password === password) {
          return true;
        }
      }
    }
  } catch (error) {
    console.error('读取账号文件失败:', error);
  }

  // 如果文件读取失败，使用默认账号
  return username === 'admin' && password === 'admin123';
}

// 简化的认证函数
function verifyCredentials(username, password) {
  return {
    success: isValidCredentials(username, password)
  };
}

const redis = Redis.fromEnv();

// CORS 头部
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default async function handler(req, res) {
  // 处理 CORS 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  const { email } = req.query;
  
  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email address required'
    });
  }

  try {
    // 验证用户身份
    const { username, password } = req.method === 'GET' ? req.query : req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password required'
      });
    }

    const authResult = verifyCredentials(username, password);
    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        error: 'Authentication failed'
      });
    }

    // 检查邮箱是否存在且属于该用户
    const emailDataStr = await redis.get(`email:${email}`);
    if (!emailDataStr) {
      return res.status(404).json({
        success: false,
        error: 'Email address not found or expired'
      });
    }

    const emailData = JSON.parse(emailDataStr);

    if (emailData.username !== username) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }

    if (req.method === 'GET') {
      // 获取邮件列表
      const messages = await getEmailMessages(email);
      
      res.status(200).json({
        success: true,
        email: email,
        messages: messages,
        count: messages.length,
        emailData: emailData
      });

    } else if (req.method === 'DELETE') {
      // 删除邮箱
      await deleteEmailAddress(email, username);
      
      res.status(200).json({
        success: true,
        message: 'Email address deleted successfully'
      });

    } else {
      res.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }

  } catch (error) {
    console.error('Email API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}

// 获取邮件消息
async function getEmailMessages(emailAddress) {
  try {
    // 获取该邮箱的所有邮件 key
    const pattern = `message:${emailAddress}:*`;
    const keys = await redis.keys(pattern);

    const messages = [];
    for (const key of keys) {
      const messageDataStr = await redis.get(key);
      if (messageDataStr) {
        const messageData = JSON.parse(messageDataStr);
        messages.push(messageData);
      }
    }

    // 按时间倒序排列
    messages.sort((a, b) => new Date(b.receivedAt) - new Date(a.receivedAt));

    return messages;
  } catch (error) {
    console.error('Get messages error:', error);
    return [];
  }
}

// 删除邮箱地址
async function deleteEmailAddress(emailAddress, username) {
  try {
    // 删除邮箱记录
    await redis.del(`email:${emailAddress}`);

    // 删除所有相关邮件
    const pattern = `message:${emailAddress}:*`;
    const keys = await redis.keys(pattern);

    for (const key of keys) {
      await redis.del(key);
    }

    // 从用户邮箱列表中移除
    const userEmailsKey = `user:${username}:emails`;
    const userEmailsStr = await redis.get(userEmailsKey);
    const userEmails = userEmailsStr ? JSON.parse(userEmailsStr) : [];
    const updatedEmails = userEmails.filter(email => email !== emailAddress);

    if (updatedEmails.length > 0) {
      await redis.set(userEmailsKey, JSON.stringify(updatedEmails), { ex: 24 * 60 * 60 });
    } else {
      await redis.del(userEmailsKey);
    }

  } catch (error) {
    console.error('Delete email error:', error);
    throw error;
  }
}
