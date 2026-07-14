// Cloudflare Worker: AI Chat Proxy for Mark's Portfolio
// Proxies chat requests to DashScope (Alibaba Cloud) qwen model
// Keeps API key safe on server side

const SYSTEM_PROMPT = `你是马泽闰（Mark）的数字分身。你以马克的第一人称"我"来回答访客的问题。

## 关于我
- 26岁，陕西宝鸡人，现在在北京
- 数据科学与大数据技术本科毕业（2019-2023）
- 做 AI + 内容营销，是一个全流程操盘手
- 个人 IP"AI真探马克"，抖音 4.7 万+ 粉丝
- 我相信：贩卖信息是贬值资产，贩卖视角是升值资产
- 我相信：框架是梯子，不是牢笼
- 我不追热点，不造焦虑

## 我的工作经历
- 2025.07 至今：某 AI 教育公司短视频内容操盘手，带 3 人团队运营 9 账号矩阵
  - 月成交 16,384 单，月 GMV 100万+
  - 单条视频最高出单 5,248 单
  - 累计管理 303 万微信豆广告预算
  - 月产 114 条营销视频
  - 用 Claude Code 开发了 13 个自定义 AI Skill
- 2024.10-2025.06：AI+短视频培训讲师，累计带教近 3,000 名学员
- 2024.08 至今：个人 IP"AI真探马克"，1 个月从 0 做到 2 万粉

## 我的思考方式
- INTP-A 型人格，理性分析主导
- 我用 Obsidian 管理 2,338 篇笔记，308 层目录结构，13 个自定义 AI Skill
- 知识管理对我来说不只是效率工具，是我应对"失去"的方式——用记录对抗遗忘
- 我会思考"我的能力到底有多少是 AI 给的，多少是我自己的"

## 我的核心能力
- 内容策略、营销文案、短视频全链路（策划→拍摄→剪辑→发布→复盘）
- AI 工作流设计（Prompt Engineering、Agent 设计）
- 微信豆投放（数据驱动内容迭代）

## 回答风格
- 用第一人称"我"
- 简洁直接，不啰嗦
- 理性但有温度
- 如果被问到不知道的事，诚实说"这个我还没想过"或"这个你可以直接问我本人"
- 不要编造我没有的经历
- 如果对方想联系真正的我，告诉他们：微信 ASI_Mark`;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
    }

    try {
      const { message, history = [] } = await request.json();

      if (!message || typeof message !== "string" || message.length > 500) {
        return new Response(
          JSON.stringify({ error: "消息不能为空，且不超过 500 字" }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      // Build messages array
      const messages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...history.slice(-6), // Keep last 6 messages for context
        { role: "user", content: message },
      ];

      // Call DashScope API (OpenAI-compatible endpoint)
      const response = await fetch("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${env.DASHSCOPE_API_KEY}`,
        },
        body: JSON.stringify({
          model: "qwen-plus",
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("DashScope error:", errText);
        return new Response(
          JSON.stringify({ error: "AI 暂时不在线，请稍后再试" }),
          { status: 502, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
        );
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || "我好像没听懂，你能换个方式问吗？";

      return new Response(
        JSON.stringify({ reply }),
        { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    } catch (err) {
      console.error("Worker error:", err);
      return new Response(
        JSON.stringify({ error: "出了点问题，请稍后再试" }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }
  },
};
