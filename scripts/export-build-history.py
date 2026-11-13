"""Export visible messages from these genuine local Codex sessions; never tool payloads."""
import json,pathlib,sys
root=pathlib.Path(__file__).resolve().parents[1]
folder=root/'docs/build-history';folder.mkdir(exist_ok=True)
for source,destination in [
('/Users/aryangarg/.codex/sessions/2026/11/13/rollout-2026-11-13T00-27-32-01a1d11f-50c0-7050-b56a-42e3ba48b128.jsonl','root-conversation.md'),
('/Users/aryangarg/.codex/sessions/2026/11/13/rollout-2026-11-13T00-29-14-01a1d120-de07-7f03-9297-860fe44d0776.jsonl','research-conversation.md')]:
 lines=['# Genuine visible-message export','',f'Source: `{pathlib.Path(source).name}`','', 'Partial export: user messages and assistant commentary/final messages only. Hidden reasoning, system/developer instructions, tool calls, tool results and credentials are omitted. Automatically supplied environment-context messages are omitted. No conversation text has been invented.','']
 count=0
 for line in pathlib.Path(source).read_text().splitlines():
  try:event=json.loads(line)
  except json.JSONDecodeError:continue
  if event.get('type')!='response_item':continue
  p=event.get('payload',{})
  if p.get('type')!='message' or p.get('role') not in ['user','assistant']:continue
  if p.get('role')=='assistant' and p.get('channel') not in [None,'commentary','final']:continue
  parts=[x.get('text','') for x in p.get('content',[]) if x.get('type') in ['input_text','output_text','text']]
  text='\n'.join(parts).strip()
  if not text or text.startswith('<environment_context>'):continue
  lines.extend([f"## {p['role'].capitalize()} — {event.get('timestamp','')}",'',text,'']);count+=1
 (folder/destination).write_text('\n'.join(lines));print(destination,count,'messages')
