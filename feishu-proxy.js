/**
 * Cloudflare Worker - 飞书 API 代理
 * 用于解决浏览器 CORS 限制，转发前端请求到飞书开放平台
 *
 * 部署步骤：
 * 1. 登录 Cloudflare Dashboard
 * 2. 进入 Workers & Pages > Create application > Create Worker
 * 3. 粘贴此代码并部署
 * 4. 绑定自定义路由（可选）：如 api.liuyuyue.aicarengine.com
 * 5. 在前端修改 API_ENDPOINT 为 Worker URL
 */

// 允许的来源域名（白名单）
const ALLOWED_ORIGINS = [
  'https://liuyuyue.aicarengine.com',
  'https://liuyuyue-birthday.pages.dev',
  'http://localhost',
  'http://127.0.0.1'
];

// CORS 响应头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// 处理 OPTIONS 预检请求
function handleOptions(request) {
  const origin = request.headers.get('Origin');

  // 验证来源
  if (origin && ALLOWED_ORIGINS.some(allowed => origin.startsWith(allowed))) {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Origin': origin,
      }
    });
  }

  return new Response(null, { status: 204, headers: corsHeaders });
}

// 主处理函数
async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  // 1. 获取 tenant_access_token
  if (path === '/api/token') {
    const body = await request.json();
    const { app_id, app_secret } = body;

    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ app_id, app_secret })
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
      }
    });
  }

  // 2. 写入飞书多维表格记录
  if (path === '/api/record') {
    const body = await request.json();
    const { tenant_access_token, app_token, table_id, record_data } = body;

    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${app_token}/tables/${table_id}/records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tenant_access_token}`,
          'Content-Type': 'application/json; charset=utf-8'
        },
        body: JSON.stringify(record_data)
      }
    );

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
      }
    });
  }

  // 默认返回 404
  return new Response('Not Found', {
    status: 404,
    headers: corsHeaders
  });
}

// Cloudflare Worker 入口
addEventListener('fetch', event => {
  const request = event.request;

  if (request.method === 'OPTIONS') {
    event.respondWith(handleOptions(request));
  } else if (request.method === 'POST') {
    event.respondWith(handleRequest(request));
  } else {
    event.respondWith(new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    }));
  }
});
