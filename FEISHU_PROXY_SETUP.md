# 飞书 API 代理部署指南

## 问题说明

由于浏览器的 CORS（跨域资源共享）安全策略，前端无法直接调用飞书开放平台 API。需要部署一个服务端代理来转发请求。

## 解决方案：Cloudflare Worker

使用 Cloudflare Worker 作为无服务器代理，优势：
- ✅ 免费额度充足（每天 10 万次请求）
- ✅ 全球 CDN 加速
- ✅ 无需维护服务器
- ✅ 与 Cloudflare Pages 同账号管理

---

## 部署步骤

### 1. 登录 Cloudflare Dashboard

访问：https://dash.cloudflare.com/

### 2. 创建 Worker

1. 点击左侧菜单 **Workers & Pages**
2. 点击右上角 **Create application**
3. 选择 **Create Worker**
4. 输入 Worker 名称：`feishu-proxy`
5. 点击 **Deploy**

### 3. 编辑 Worker 代码

1. 部署完成后，点击 **Edit code**
2. 删除默认代码
3. 复制 `feishu-proxy.js` 的全部内容粘贴进去
4. 点击右上角 **Save and Deploy**

### 4. 获取 Worker URL

部署成功后，会显示 Worker URL，格式类似：
```
https://feishu-proxy.你的用户名.workers.dev
```

**记下这个 URL，后续需要用到！**

### 5. 绑定自定义域名（可选）

如果想使用自定义域名（如 `api.liuyuyue.aicarengine.com`）：

1. 在 Worker 详情页，点击 **Settings** > **Triggers**
2. 点击 **Add Custom Domain**
3. 输入子域名：`api.liuyuyue.aicarengine.com`
4. 点击 **Add Custom Domain**
5. Cloudflare 会自动添加 DNS 记录

---

## 修改前端代码

部署完 Worker 后，需要修改 `main.js` 使用代理。

### 修改 main.js

在 `main.js` 第 158 行后添加 Worker URL 配置：

```javascript
// --- 4. 飞书表单集成提交逻辑 ---
const form = document.getElementById('rsvp-form');
const submitBtn = document.getElementById('submit-btn');
const formMsg = document.getElementById('form-msg');

// ⚠️ 替换为你的 Worker URL
const WORKER_URL = 'https://feishu-proxy.你的用户名.workers.dev';

const APP_ID = 'cli_a90716a41df91bd7';
const APP_SECRET = '0Clk4zaqwHd3K46eT3HL3elGLq3rzGgL';
const APP_TOKEN = 'KhV9bKFsHadmsysLgDccWs6enxh';
const TABLE_ID = 'tblmIWN7ZXmVymZV';
```

然后替换表单提交逻辑（第 177-233 行）为：

```javascript
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const guestName = document.getElementById('guest-name').value;
    const guestCount = document.getElementById('guest-count').value;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 发送中...';
    submitBtn.classList.add('opacity-70');

    try {
        // 1. 通过代理获取 Token
        const tokenRes = await fetch(`${WORKER_URL}/api/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ app_id: APP_ID, app_secret: APP_SECRET })
        });

        const tokenData = await tokenRes.json();
        if (tokenData.code !== 0) throw new Error('获取 Token 失败:' + tokenData.msg);

        const tenantAccessToken = tokenData.tenant_access_token;

        // 2. 通过代理写入记录
        const writeRes = await fetch(`${WORKER_URL}/api/record`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tenant_access_token: tenantAccessToken,
                app_token: APP_TOKEN,
                table_id: TABLE_ID,
                record_data: {
                    fields: {
                        "来宾姓名": guestName,
                        "赴宴人数": guestCount
                    }
                }
            })
        });

        const writeData = await writeRes.json();

        if (writeData.code === 0) {
            showMsg('收到您的回执啦！期待与您相聚~', true);
            form.reset();
        } else {
            throw new Error('写入表格失败:' + writeData.msg);
        }

    } catch (error) {
        console.error(error);
        showMsg('哎呀，信使迷路了，请直接联系麻麻。', false);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> 提交 Submit';
        submitBtn.classList.remove('opacity-70');
    }
});
```

---

## 测试验证

1. 部署完 Worker 并修改前端代码后，重新提交代码：
   ```bash
   git add .
   git commit -m "feat: 使用 Cloudflare Worker 代理解决飞书 API CORS 问题"
   git push origin main
   ```

2. 等待 Cloudflare Pages 部署完成（约 1-2 分钟）

3. 访问 https://liuyuyue.aicarengine.com

4. 填写表单提交，应该能成功写入飞书多维表格

---

## 故障排查

### Worker 返回 404

检查 Worker 代码中的路径：
- `/api/token` - 获取 Token
- `/api/record` - 写入记录

### 仍然有 CORS 错误

1. 检查 `ALLOWED_ORIGINS` 白名单是否包含你的域名
2. 检查前端代码中的 `WORKER_URL` 是否正确

### Token 获取失败

检查飞书应用凭证：
- `APP_ID` 和 `APP_SECRET` 是否正确
- 应用是否已启用

### 写入记录失败

检查飞书多维表格配置：
- `APP_TOKEN` 和 `TABLE_ID` 是否正确
- 应用是否有表格写入权限
- 字段名称是否匹配（"来宾姓名"、"赴宴人数"）

---

## 安全建议

**⚠️ 当前方案将 APP_ID 和 APP_SECRET 暴露在前端代码中，存在安全风险！**

**生产环境建议**：
1. 将凭证配置在 Worker 环境变量中（Cloudflare Workers Secrets）
2. 前端不传递凭证，直接传递表单数据
3. Worker 自行处理鉴权和 API 调用

### 安全版本（推荐）

修改 Worker 代码，将凭证配置为环境变量：

```javascript
// 在 Cloudflare Dashboard > Worker Settings > Variables 中配置
const APP_ID = env.FEISHU_APP_ID;
const APP_SECRET = env.FEISHU_APP_SECRET;
const APP_TOKEN = env.FEISHU_APP_TOKEN;
const TABLE_ID = env.FEISHU_TABLE_ID;
```

前端只需传递表单数据：
```javascript
const response = await fetch(`${WORKER_URL}/api/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        guest_name: guestName,
        guest_count: guestCount
    })
});
```
