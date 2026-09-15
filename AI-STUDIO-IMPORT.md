# AI Studio 免登录源码包

已移除登录入口、身份请求头校验及本地模拟登录模块。打开即用，无注册、登录或账号系统。数据归属于单一 personal-workspace 工作区；访问同一部署的使用者共享图片、设置和生成额度，因此这个版本适合个人受限访问使用。

源码仍使用 Cloudflare D1 / R2，需要 AI Studio 迁移存储和运行环境。此包不包含密钥、历史数据和图片。

## 导入
将 ZIP 解压后的文件放入自己的 GitHub 仓库根目录，在 AI Studio Build 使用 + → Import from GitHub；如果界面提供 Upload ZIP，也可以使用。
官方说明：https://ai.google.dev/gemini-api/docs/aistudio-build-mode

## 粘贴给 AI Studio
请基于现有源码迁移成 AI Studio 可运行的个人商品影像工作室，保留现有中文界面和功能，不要重做设计。不要添加登录、注册、账号模块或登录跳转。使用单一工作区，不信任客户端传入的用户标识。将 Vinext / Cloudflare Workers 改为支持的 React + Node 服务端，将 D1 / R2 换为目标环境可用的持久数据库和图片存储，保持现有接口契约。保留上传参考图、多种风格、场景编辑、1–100 张任务、默认 2K、Gemini 和豆包、串行队列、配额诊断、历史及 ZIP 下载。密钥只在服务端安全保存。先列出必需的存储配置，再完成迁移与运行验证。不要把内存或临时目录当作长期存储。不要添加任何登录功能。
