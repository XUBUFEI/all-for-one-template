# All for One · 空白个人工作站

中英双语的本地个人工作站：工作项目与四象限待办、健康记录、旅行档案、3x3 时间导入、每周回顾，以及随当天记录变化的像素生活角。

**默认空数据库，不包含作者的工作、健康或旅行数据，也不关联作者的云端站点。**

```sh
pnpm install --frozen-lockfile
pnpm dev
```

需要 Node.js 24 LTS、pnpm 11.25.0。打开 http://127.0.0.1:5173/ 即可使用。支持 Windows、macOS、Linux。本地模拟登录只允许本机使用。

- [快速上手](START_HERE.md)
- [给 AI 编程助手的说明](AGENTS.md)
- [AI / MCP 接入](docs/AI_SETUP.md)
- [隐私与模板范围](docs/TEMPLATE_SCOPE.md)
- [可选的虚构 JSON 示例](examples/records.json)（不会自动导入）

## 能做什么

- 按项目管理任务、重要性、紧迫度、截止日期、等待事项及变更历史。
- 记录饮食营养、训练、体重；未知值保持空缺，目标由使用者设置。
- 保留旅行原文及双语内容。
- 导入标准 JSON；`scripts/normalize-3x3.py` 可将 Today3x3 ZIP 转为工作站记录格式。
- 按实际完成日期生成周回顾，支持 JSON 备份。
- 根据当天的真实记录显示像素物件，不调用外部图片生成服务。

## 维护

```sh
pnpm typecheck
pnpm test
pnpm build
pnpm backup
```

数据位于忽略的 `.wrangler/state/`；备份位于 `backups/`。修改显示名称在 `lib/config.ts`，修改外观在 `app/globals.css`。自动检查在 `.github/workflows/check.yml`。

源码采用 [MIT](LICENSE)；字体、基础 UI 和构建辅助代码保留各自许可。思源宋体的完整字体与 UI 子集随仓库提供，不需要额外下载字体。详见 `public/fonts/` 和 `vendor/` 中的许可文件。
