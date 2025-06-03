#!/usr/bin/env node

/**
 * 密码哈希生成工具
 * 用于生成用户密码的哈希值
 */

const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 默认盐值（应与 API 中的保持一致）
const DEFAULT_SALT = 'augment_salt_2024';

function hashPassword(password, salt = DEFAULT_SALT) {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

function generateHash() {
  console.log('🔐 Augment 密码哈希生成工具');
  console.log('================================');
  
  rl.question('请输入要生成哈希的密码: ', (password) => {
    if (!password) {
      console.log('❌ 密码不能为空');
      rl.close();
      return;
    }
    
    rl.question(`请输入盐值 (默认: ${DEFAULT_SALT}): `, (salt) => {
      const actualSalt = salt || DEFAULT_SALT;
      const hash = hashPassword(password, actualSalt);
      
      console.log('\n✅ 生成结果:');
      console.log('================================');
      console.log(`密码: ${password}`);
      console.log(`盐值: ${actualSalt}`);
      console.log(`哈希: ${hash}`);
      console.log('\n📋 环境变量配置:');
      console.log(`PASSWORD_SALT=${actualSalt}`);
      console.log(`USER_PASSWORD_HASH=${hash}`);
      console.log('\n💡 请将哈希值添加到 Vercel 环境变量中');
      
      rl.close();
    });
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  generateHash();
}

module.exports = { hashPassword };
