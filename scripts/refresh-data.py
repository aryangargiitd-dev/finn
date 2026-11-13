"""Refresh auditable market/filing cache. Standard public endpoints; no auth evasion."""
import urllib.request, json, datetime, concurrent.futures, pathlib, time
ROOT=pathlib.Path(__file__).resolve().parents[1]
TICKERS=['RELIANCE','TCS','INFY','HDFCBANK','ICICIBANK','SBIN','BHARTIARTL','ITC','LT','MARUTI','SUNPHARMA','TITAN','ASIANPAINT','HCLTECH','PERSISTENT','KPITTECH','TARSONS','GICHSGFIN']
def fetch(url):
 request=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; FINN research prototype)','Accept':'*/*'})
 with urllib.request.urlopen(request,timeout=20) as response:
  data=response.read(4_000_001)
  if len(data)>4_000_000:raise ValueError('Size limit')
  return data
stamp=datetime.datetime.now(datetime.timezone.utc).isoformat()
def quote(ticker):
 url=f'https://query2.finance.yahoo.com/v8/finance/chart/{ticker}.NS?range=3mo&interval=1d'
 try:
  payload=json.loads(fetch(url));result=payload['chart']['result'][0]
  assert result['meta']['symbol']==ticker+'.NS'
  return ticker,{'fetchedAt':stamp,'sourceUrl':url,'result':result}
 except Exception as e:print(ticker,str(e));return ticker,None
existing=json.loads((ROOT/'data/market-cache.json').read_text()) if (ROOT/'data/market-cache.json').exists() else {}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for ticker,value in pool.map(quote,TICKERS):
  if value:existing[ticker]=value
(ROOT/'data/market-cache.json').write_text(json.dumps(existing,separators=(',',':')))
for name,url in [('nse','https://nsearchives.nseindia.com/content/RSS/Online_announcements.xml'),('bse','https://www.bseindia.com/data/xml/announcements.xml')]:
 try:
  xml=fetch(url).decode('utf-8-sig');(ROOT/f'data/{name}-cache.json').write_text(json.dumps({'xml':xml,'fetchedAt':stamp,'sourceUrl':url}));print(name,'saved')
 except Exception as e:print(name,str(e))
print('Validated market symbols:',len(existing))
