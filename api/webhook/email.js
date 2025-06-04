/**
 * 邮件 Webhook 处理器
 * 接收来自 Cloudflare Email Routing 的邮件
 * POST /api/webhook/email
 */

import { Redis } from '@upstash/redis';
import crypto from 'crypto';

const redis = Redis.fromEnv();

// 验证 webhook 签名
function verifyWebhookSignature(signature, body, secret) {
  if (!signature || !signature.startsWith('Bearer ')) {
    return false;
  }
  
  const token = signature.substring(7);
  return token === secret;
}

// 提取验证码
function extractVerificationCode(content) {
  const patterns = [
    /验证码[：:\s]*(\d{4,8})/i,
    /verification code[：:\s]*(\d{4,8})/i,
    /code[：:\s]*(\d{4,8})/i,
    /(\d{6})/g  // 6位数字
  ];
  
  for (const pattern of patterns) {
    const match = content.match(pattern);
    if (match) {
      return match[1] || match[0];
    }
  }
  
  return null;
}

// 清理和格式化邮件内容
function cleanEmailContent(content) {
  // 移除 HTML 标签
  let cleanContent = content.replace(/<[^>]*>/g, '');
  
  // 移除多余的空白字符
  cleanContent = cleanContent.replace(/\s+/g, ' ').trim();
  
  // 限制长度
  if (cleanContent.length > 1000) {
    cleanContent = cleanContent.substring(0, 1000) + '...';
  }
  
  return cleanContent;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 验证 webhook 签名
    const signature = req.headers.authorization;
    const webhookSecret = process.env.WEBHOOK_SECRET;
    
    if (!verifyWebhookSignature(signature, req.body, webhookSecret)) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const emailData = req.body;
    
    // 验证必要字段
    if (!emailData.to || !emailData.from) {
      console.error('Missing required email fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const emailAddress = emailData.to;
    
    // 检查邮箱是否存在
    const targetEmailStr = await redis.get(`email:${emailAddress}`);
    if (!targetEmailStr) {
      console.log(`Email address ${emailAddress} not found, ignoring message`);
      return res.status(200).json({ message: 'Email address not found, ignored' });
    }

    const targetEmail = JSON.parse(targetEmailStr);

    // 创建邮件记录
    const messageId = crypto.randomUUID();
    const cleanContent = cleanEmailContent(emailData.content || emailData.text || '');
    
    const messageData = {
      id: messageId,
      to: emailAddress,
      from: emailData.from,
      subject: emailData.subject || '(无主题)',
      content: cleanContent,
      receivedAt: new Date().toISOString(),
      isRead: false
    };

    // 提取验证码
    const verificationCode = extractVerificationCode(cleanContent);
    if (verificationCode) {
      messageData.verificationCode = verificationCode;
      messageData.hasVerificationCode = true;
    }

    // 存储邮件，设置 TTL 为 24 小时
    const messageKey = `message:${emailAddress}:${messageId}`;
    await redis.set(messageKey, JSON.stringify(messageData), { ex: 24 * 60 * 60 });

    // 更新邮箱的邮件计数
    const updatedEmailData = {
      ...targetEmail,
      messageCount: (targetEmail.messageCount || 0) + 1,
      lastMessageAt: messageData.receivedAt
    };

    await redis.set(`email:${emailAddress}`, JSON.stringify(updatedEmailData), { ex: 24 * 60 * 60 });

    console.log(`Email received for ${emailAddress}: ${messageData.subject}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'Email processed successfully',
      messageId: messageId
    });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
