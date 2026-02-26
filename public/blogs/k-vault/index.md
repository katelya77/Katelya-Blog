# 【重大更新】K-Vault：从图床到全能聚合云盘，打造你的零成本私有数据金库！

> “基于 Cloudflare 的 Serverless 聚合云盘。以 Telegram 为核心（支持 Webhook 直传与 2GB 扩展），并全面兼容 R2、S3、Discord 及 HuggingFace 等多存储后端。零成本构建你的全能私有数据金库。”

## 📖 前言与更名公告

熟悉我的朋友可能知道，前段时间我开发了一个名为 **Katelya-TGBed** 的项目。起初的动机非常简单：女朋友给我发了太多日常照片，为了妥善且安全地管理我们俩的这些珍贵回忆，我写了这个基于 Telegram 的无限空间图床。

但随着项目的迭代和大家的使用反馈，我发现单纯的“图床”和单一的 Telegram 存储已经无法满足日常折腾的需求了。于是，经过近期的爆肝更新，项目迎来了史诗级的重构与升级，并正式更名为 **K-Vault**！

为什么叫 Vault？因为现在它不仅仅是一个“床（Bed）”，而是你真正的**全能私有数据金库**！

## 🚀 核心大升级：多存储后端与 Telegram 增强

**GitHub 项目地址**：[katelya77/K-Vault](https://github.com/katelya77/K-Vault) (喜欢的话求个 Star ⭐️)

本次更新打破了原有单一后端的局限，将存储选择权彻底交给你。以下是 K-Vault 目前支持的王炸级新特性：

### 1. 📂 多元化存储方案全面兼容
告别单点依赖，现在你可以根据文件类型和大小，自由组合配置你的底层存储：
* **Cloudflare R2**：支持 100MB 分片上传，配合全球 CDN，稳如老狗。
* **S3 兼容 API**：完美接入各类兼容 S3 协议的第三方对象存储，同样支持 100MB 分片。
* **Discord 存储**：利用 Webhook 与 Bot Token，白嫖 Discord 的稳定空间（无 Boost 支持 25MB，Level 2+ 可达 50-100MB）。
* **HuggingFace**：机器学习大厂的羊毛也能薅！普通文件支持 35MB，开启 LFS 甚至能狂飙到 50GB。

### 2. ⚡ Telegram 增强模式 (Webhook 直传)
作为 K-Vault 的核心引擎，Telegram 存储这次也迎来了满血进化：
* **Webhook 模式接入**：不仅支持传统的长轮询，现在完美支持配置 `TG_WEBHOOK_SECRET` 走 Webhook 直传，大幅提升响应效率和上传稳定性。
* **突破限制的大文件支持**：受限于原生 Bot API 的 20MB 限制？现在配合自部署 Telegram Bot API Server，最大可扩展支持 **2GB** 的超大文件存储！
* **更灵活的安全策略**：新增签名直链密钥 (`FILE_URL_SECRET`) 与降低 KV 写入频率的模式，保障隐私的同时优化性能。

### 3. 🛠️ 依然主打“零成本”与“Serverless”
项目的初心没变，由于全站基于 **Cloudflare Pages** 配合边缘计算（Functions）运行，不需要你掏钱买任何服务器。前端依然是我最爱的 Next.js (React) + TypeScript 组合，轻量且极速。

## 📝 部署指南与快速上手

即便加了这么多强大的功能，K-Vault 的部署依然秉持“有手就行”的原则。所有的存储后端都可以通过环境变量（如 `USE_R2`、`S3_ENDPOINT`、`DISCORD_WEBHOOK_URL` 等）灵活开关。

* **完全零基础？** 直接查阅 GitHub 仓库的 README 指南即可一键部署。
* **想二次开发？** 遇到报错不用慌，直接把代码丢给 Cursor 或者 GitHub Copilot 就行了。

后续我也会考虑在 B 站录一期实战教程视频，手把手带大家把各种存储方案都配置一遍，记得关注！

## 🔗 写在最后

从给 Nana 存照片的小工具，到现在的聚合多存储云盘，K-Vault 倾注了我不少心血。如果你也和我一样有文件存储焦虑，或者喜欢白嫖各类云服务搭建自己的图床/网盘，千万不要错过它。

* **项目主页**：[https://github.com/katelya77/K-Vault](https://github.com/katelya77/K-Vault)
* 如果遇到 Bug 或者有新功能的建议，欢迎随时提交 Issues，也极其欢迎各位大佬提交 PR 共同完善代码。大家反馈问题时请保持礼貌，共同进步！