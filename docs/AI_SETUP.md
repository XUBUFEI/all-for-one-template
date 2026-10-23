# 连接自己的 AI

先运行 `pnpm dev`。本地 MCP 桥使用标准输入输出 JSON-RPC，把请求转到本机工作站，不需要 OpenAI API 密钥。

在支持 MCP stdio 的客户端中添加（替换为实际绝对路径；Windows 路径可用正斜杠）：

```json
{
  "mcpServers": {
    "all-for-one-local": {
      "command": "node",
      "args": ["/absolute/path/all-for-one-template/scripts/mcp-local.mjs"],
      "env": {"WORKSPACE_URL": "http://127.0.0.1:5173"}
    }
  }
}
```

工具：`query_records`、`upsert_records`、`update_task`、`get_dashboard`、`get_work_review`。请让 AI 先查询，再修改。

- 每条写入要有 `kind`、实际发生日期 `date`、包含 `title` 的 `data`，以及稳定的 `sourceKey`；每批最多 100 条。
- 项目/任务关联 ID 必须来自查询结果，不能从外部 app 的 ID 直接搬过来。
- 更新已有数据保留完整 data，传入原 id 和可选 expectedUpdatedAt。状态变化优先 update_task。
- 未知营养素不要填写 0；估算注明 estimated=true。用户没有设置目标时保持未设置。
- 查询时间范围可用 from/to；完整备份使用网页导出或 `pnpm backup`，不要把有界查询误当完整导出。
- 本地桥拥有本地使用者的读写权限。只将它配置给信任的 AI 客户端，不要分享到公共服务器。它拒绝非回环 HTTP 目的地址。

没有 MCP 的 AI 可以生成 `examples/records.json` 那样的结构，在网页“导入与同步”导入。先审阅内容，避免把计划当实际发生。

这份模板不提供模型服务；AI 客户端本身的账号、模型与费用由使用者选择。
