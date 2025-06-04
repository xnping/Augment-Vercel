// api/accounts.js - 账号管理接口

// 管理员密钥（用于验证管理员权限）
const ADMIN_KEY = process.env.ADMIN_KEY || 'admin_secret_key_2024';

// 内存中的账号数据存储（Vercel 环境下使用）
let memoryAccountsData = null;

// 读取账号数据
function readAccountsData() {
  // 在 Vercel 环境中使用内存存储
  if (!memoryAccountsData) {
    memoryAccountsData = getDefaultAccountsData();
  }
  return JSON.parse(JSON.stringify(memoryAccountsData)); // 深拷贝
}

// 获取默认账号数据
function getDefaultAccountsData() {
  return {
    accounts: {
      admin: {
        username: 'admin',
        passwordHash: '228d40e2fd54baf63d2a88260d0a903d031f274485439c397c43f6db1e1b1755', // admin123
        role: 'admin',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null,
        enabled: true,
        description: '默认管理员账号'
      },
      user1: {
        username: 'user1',
        passwordHash: '85786b7aece20433efcc965b6ec78fef9a1f5721d8004d865438b0d5854232a7', // hello
        role: 'user',
        createdAt: '2024-01-01T00:00:00.000Z',
        lastLogin: null,
        enabled: true,
        description: '默认用户账号'
      }
    },
    settings: {
      passwordSalt: 'augment_salt_2024',
      maxAccounts: 50,
      defaultRole: 'user'
    },
    metadata: {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      totalAccounts: 2
    }
  };
}

// 写入账号数据
function writeAccountsData(data) {
  // 更新元数据
  data.metadata.lastUpdated = new Date().toISOString();
  data.metadata.totalAccounts = Object.keys(data.accounts).length;

  // 在 Vercel 环境中更新内存存储
  memoryAccountsData = JSON.parse(JSON.stringify(data)); // 深拷贝
}

// 生成随机密码
function generateRandomPassword(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// 验证管理员权限
function verifyAdminKey(req) {
  const adminKey = req.headers['x-admin-key'] || req.body.adminKey;
  return adminKey === ADMIN_KEY;
}

export default function handler(req, res) {
  // 设置 CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // 验证管理员权限
    if (!verifyAdminKey(req)) {
      return res.status(401).json({
        success: false,
        message: '需要管理员权限'
      });
    }

    const data = readAccountsData();

    switch (req.method) {
      case 'GET':
        return handleGetAccounts(req, res, data);
      case 'POST':
        return handleCreateAccount(req, res, data);
      case 'PUT':
        return handleUpdateAccount(req, res, data);
      case 'DELETE':
        return handleDeleteAccount(req, res, data);
      default:
        return res.status(405).json({
          success: false,
          message: '不支持的请求方法'
        });
    }
  } catch (error) {
    console.error('账号管理API错误:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误',
      error: error.message
    });
  }
}

// 获取账号列表
function handleGetAccounts(req, res, data) {
  const accounts = Object.values(data.accounts).map(account => ({
    username: account.username,
    role: account.role,
    createdAt: account.createdAt,
    lastLogin: account.lastLogin,
    enabled: account.enabled,
    description: account.description
  }));

  res.status(200).json({
    success: true,
    accounts: accounts,
    metadata: data.metadata,
    settings: data.settings
  });
}

// 创建新账号
function handleCreateAccount(req, res, data) {
  const { username, password, role = 'user', description = '' } = req.body;

  // 验证输入
  if (!username || !username.match(/^[a-zA-Z0-9_]{3,20}$/)) {
    return res.status(400).json({
      success: false,
      message: '用户名格式不正确（3-20位字母数字下划线）'
    });
  }

  if (data.accounts[username]) {
    return res.status(400).json({
      success: false,
      message: '用户名已存在'
    });
  }

  if (Object.keys(data.accounts).length >= data.settings.maxAccounts) {
    return res.status(400).json({
      success: false,
      message: `账号数量已达上限（${data.settings.maxAccounts}）`
    });
  }

  // 生成密码（如果未提供）
  const finalPassword = password || generateRandomPassword();

  // 创建账号
  const newAccount = {
    username: username,
    password: finalPassword, // 直接存储明文密码
    role: role,
    createdAt: new Date().toISOString(),
    lastLogin: null,
    enabled: true,
    description: description
  };

  data.accounts[username] = newAccount;
  writeAccountsData(data);

  res.status(201).json({
    success: true,
    message: '账号创建成功',
    account: {
      username: username,
      password: finalPassword, // 只在创建时返回明文密码
      role: role,
      description: description
    }
  });
}

// 更新账号
function handleUpdateAccount(req, res, data) {
  const { username } = req.query;
  const { password, role, enabled, description } = req.body;

  if (!data.accounts[username]) {
    return res.status(404).json({
      success: false,
      message: '账号不存在'
    });
  }

  const account = data.accounts[username];

  // 更新字段
  if (password) {
    account.password = password; // 直接存储明文密码
  }
  if (role !== undefined) account.role = role;
  if (enabled !== undefined) account.enabled = enabled;
  if (description !== undefined) account.description = description;

  writeAccountsData(data);

  res.status(200).json({
    success: true,
    message: '账号更新成功',
    account: {
      username: account.username,
      role: account.role,
      enabled: account.enabled,
      description: account.description
    }
  });
}

// 删除账号
function handleDeleteAccount(req, res, data) {
  const { username } = req.query;

  if (!data.accounts[username]) {
    return res.status(404).json({
      success: false,
      message: '账号不存在'
    });
  }

  // 防止删除最后一个管理员账号
  const adminAccounts = Object.values(data.accounts).filter(acc => acc.role === 'admin');
  if (data.accounts[username].role === 'admin' && adminAccounts.length === 1) {
    return res.status(400).json({
      success: false,
      message: '不能删除最后一个管理员账号'
    });
  }

  delete data.accounts[username];
  writeAccountsData(data);

  res.status(200).json({
    success: true,
    message: '账号删除成功'
  });
}
