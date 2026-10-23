// The one-time history migration is complete. Daily imports use authenticated
// records/MCP operations. This endpoint stays closed regardless of stale secrets.
const closed=()=>Response.json({error:'一次性历史导入已完成；后续记录请通过聊天工具或导入面板同步。'},{status:410});
export const dynamic='force-dynamic';
export async function GET(){return closed();}
export async function POST(){return closed();}
