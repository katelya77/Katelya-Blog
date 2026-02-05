# 告别存储焦虑：Katelya-TGBed —— 基于 Telegram 的无限空间图床方案

### 📖 前言

好久没逛 发Blog 了，上次活跃还是关于 **DecoTV** 和 **KatelyaTV** 的话题。

聊聊开发这个项目的起因：其实是因为女朋友平时发了太多照片，我生怕漏掉哪一张。万一哪天被问起来没保存或者没记住，免不了被“狠狠批斗” (懂的都懂 😅)。为了自救，也为了更好地管理这些照片，就有了这个项目。

在进入正文前，也顺便安利一下我一直在修饰完善的 **DecoTV**。走过路过不要错过，如果喜欢的话，欢迎点个 Star 鼓励一下！
👉 **DecoTV 项目地址：** [https://github.com/Decohererk/DecoTV](https://github.com/Decohererk/DecoTV)

---

### 🚀 正文：Katelya-TGBed

**GitHub 项目地址：** [katelya77/Katelya-TGBed](https://github.com/katelya77/Katelya-TGBed)

**Katelya-TGBed** 是一个利用 **Telegram** 作为后端存储、旨在提供 **无限空间** 且 **高速访问** 的图床/文件床方案。

项目刚刚开源，主打轻量、免费、易部署，特别适合个人开发者、博客主或需要临时文件存储的朋友使用。

#### ✨ 核心特性

* **☁️ 无限存储**：依托 Telegram 强大的服务器，理论上没有存储上限。
* **⚡ 高速访问**：结合 Cloudflare 全球 CDN 加速，实现图片加载毫秒级响应。
* **🔌 API 支持**：提供标准的上传 API，方便集成到 PicGo 或其他工具中。
* **🔒 隐私安全**：支持自定义配置，图片/文件通过 Bot 传输，安全可控。
* **🛠️ 简单部署**：支持一键部署到 Cloudflare Pages，**无需购买服务器，零成本运行**。

#### 🛠️ 技术栈

* **后端**：Cloudflare Pages
* **存储**：Telegram Bot API / R2 / KV
* **前端**：Next.js (React)

#### 📖 如何使用

部署非常简单，直接参考项目内的 `README` 指导即可。可以说是有手就行，实在遇到困难，也可以直接把代码丢给 AI 寻求帮助！

---

### 🔗 项目链接

欢迎大家体验并提出宝贵意见，如果觉得好用，求一个 **Star ⭐️**！

* **GitHub 主页**: [https://github.com/katelya77/Katelya-TGBed](https://github.com/katelya77/Katelya-TGBed)

---

### 💬 写在最后

目前的初衷主要是为了存女朋友的照片，所以目前对**图片内容**做了较多测试，其他功能尚在完善中。

* **遇到 Bug？** 欢迎提交 [Issues](https://github.com/katelya77/Katelya-TGBed/issues)，我会尽快查看。
* **想要贡献？** 欢迎开发者们提交 PR，共同完善！
* **温馨提示**：反馈问题时请保持礼貌，大家共同进步。