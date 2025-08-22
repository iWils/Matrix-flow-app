
export async function sendWebhook(event: string, payload: unknown, url?: string){
  const target = url || process.env.NOTIFY_WEBHOOK_URL
  if(!target) return
  try{
    await fetch(target, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event, payload }) })
  }catch{}
}
