/* =====================================================================
   IPTV TIZEN - Relay para adicionar lista pelo celular
   Cloudflare Worker (grátis). Precisa de um KV namespace ligado como "LISTS".
   - GET  /            -> página para o celular
   - POST /api/send    -> celular envia {code, list}
   - GET  /api/get     -> TV busca a lista pelo código (e apaga em seguida)
   A lista fica guardada no máximo 15 minutos.
   ===================================================================== */
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const json = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

    if (url.pathname === '/api/send' && req.method === 'POST') {
      let b; try { b = await req.json(); } catch (e) { return json({ ok: false, erro: 'Dados inválidos' }, 400); }
      const code = String(b.code || '').replace(/\D/g, '');
      const l = b.list || {};
      if (code.length !== 6) return json({ ok: false, erro: 'O código tem 6 números' }, 400);
      const clean = s => String(s || '').trim().slice(0, 2000);
      let list;
      if (l.type === 'xtream') {
        list = { type: 'xtream', name: clean(l.name).slice(0, 60), server: clean(l.server), user: clean(l.user), pass: clean(l.pass) };
        if (!list.server || !list.user || !list.pass) return json({ ok: false, erro: 'Preencha URL/DNS, usuário e senha' }, 400);
      } else {
        list = { type: 'm3u', name: clean(l.name).slice(0, 60), url: clean(l.url) };
        if (!/^https?:\/\//i.test(list.url)) return json({ ok: false, erro: 'O link precisa começar com http:// ou https://' }, 400);
      }
      await env.LISTS.put('c:' + code, JSON.stringify(list), { expirationTtl: 900 });
      return json({ ok: true });
    }

    if (url.pathname === '/api/get') {
      const code = String(url.searchParams.get('code') || '').replace(/\D/g, '');
      if (code.length !== 6) return json({ ok: false });
      const v = await env.LISTS.get('c:' + code);
      if (!v) return json({ ok: false });
      await env.LISTS.delete('c:' + code);
      return json({ ok: true, list: JSON.parse(v) });
    }

    return new Response(PAGE, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
};

const PAGE = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>IPTV TIZEN · Enviar lista</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#07090e;color:#f1f3f8;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;min-height:100vh;padding:28px 18px 40px}
.wrap{max-width:460px;margin:0 auto}
.logo{width:56px;height:56px;border-radius:16px;background:linear-gradient(135deg,#7c5cff,#22d3ee);display:flex;flex-direction:column;align-items:center;justify-content:center;font-weight:900;font-size:15px;line-height:1;margin-bottom:18px}
.logo small{font-size:8px;letter-spacing:1px;margin-top:3px}
h1{font-size:26px;margin-bottom:6px}
p.s{color:#8c94a7;margin-bottom:24px;line-height:1.45}
label{display:block;font-size:14px;color:#8c94a7;font-weight:600;margin:16px 0 7px 2px}
input{width:100%;height:52px;border-radius:13px;border:2px solid #222838;background:#10131b;color:#fff;font-size:16px;padding:0 16px;outline:0}
input:focus{border-color:#7c5cff}
#code{font-size:28px;letter-spacing:10px;text-align:center;font-weight:800}
.tabs{display:flex;background:#10131b;padding:5px;border-radius:14px;margin-top:22px}
.tabs button{flex:1;height:44px;border:0;border-radius:10px;background:transparent;color:#8c94a7;font-size:15px;font-weight:700}
.tabs button.on{background:#1d2230;color:#fff}
.go{width:100%;height:56px;border:0;border-radius:14px;background:#7c5cff;color:#fff;font-size:18px;font-weight:800;margin-top:26px}
.go:disabled{opacity:.5}
.msg{margin-top:16px;text-align:center;font-weight:600;min-height:22px}
.err{color:#f43f5e}.ok{color:#34d399}
.hide{display:none}
.note{color:#5d6475;font-size:13px;margin-top:28px;line-height:1.5;text-align:center}
</style></head><body><div class="wrap">
<div class="logo">IPTV<small>TIZEN</small></div>
<h1>Enviar lista para a TV</h1><p class="s">Digite o código que aparece na tela <b>Adicionar lista</b> da TV.</p>
<label>Código da TV</label><input id="code" inputmode="numeric" maxlength="6" placeholder="000000">
<div class="tabs"><button id="tm" class="on" type="button">Link M3U</button><button id="tx" type="button">Conta (DNS/usuário/senha)</button></div>
<label>Nome da lista (opcional)</label><input id="name" placeholder="Ex.: Lista da sala">
<div id="fm"><label>Link da lista M3U</label><input id="url" type="url" autocapitalize="off" autocomplete="off" placeholder="http://..."></div>
<div id="fx" class="hide"><label>URL / DNS do servidor</label><input id="server" autocapitalize="off" autocomplete="off" placeholder="http://dns.servidor.com:8080">
<label>Usuário</label><input id="user" autocapitalize="off" autocomplete="off"><label>Senha</label><input id="pass" autocapitalize="off" autocomplete="off"></div>
<button class="go" id="go">Enviar para a TV</button><div class="msg" id="msg"></div>
<p class="note">Os dados vão direto para a sua TV e são apagados deste servidor assim que a TV recebe (ou em 15 minutos).</p>
</div><script>
var t='m3u',$=function(i){return document.getElementById(i)};
var c=new URLSearchParams(location.search).get('c');if(c)$('code').value=c.replace(/\\D/g,'').slice(0,6);
$('tm').onclick=function(){t='m3u';$('tm').className='on';$('tx').className='';$('fm').className='';$('fx').className='hide'};
$('tx').onclick=function(){t='xtream';$('tx').className='on';$('tm').className='';$('fx').className='';$('fm').className='hide'};
$('go').onclick=function(){
 var m=$('msg'),code=$('code').value.replace(/\\D/g,'');
 if(code.length!==6){m.className='msg err';m.textContent='O código tem 6 números';return}
 var list=t==='m3u'?{type:'m3u',name:$('name').value,url:$('url').value.trim()}:{type:'xtream',name:$('name').value,server:$('server').value.trim(),user:$('user').value.trim(),pass:$('pass').value.trim()};
 $('go').disabled=true;m.className='msg';m.textContent='Enviando…';
 fetch('/api/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:code,list:list})}).then(function(r){return r.json()}).then(function(r){
  if(r.ok){m.className='msg ok';m.textContent='✓ Enviado! Olhe para a TV — ela vai carregar a lista em alguns segundos.'}
  else{m.className='msg err';m.textContent=r.erro||'Não foi possível enviar';$('go').disabled=false}
 }).catch(function(){m.className='msg err';m.textContent='Sem conexão. Tente de novo.';$('go').disabled=false});
};
</script></body></html>`;
