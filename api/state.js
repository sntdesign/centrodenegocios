// Vercel serverless function. No publiques las claves en GitHub ni en index.html.
const crypto = require('node:crypto');
function permitted(received, expected) {
  if (!received || !expected) return false;
  const a = crypto.createHash('sha256').update(received).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a,b);
}
module.exports = async (req,res) => {
  res.setHeader('Cache-Control','no-store');
  if (!['GET','PUT'].includes(req.method)) return res.status(405).json({error:'Método no permitido'});
  const secret = process.env.ACCESS_KEY;
  const token = String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if (!permitted(token,secret)) return res.status(401).json({error:'Enlace de acceso inválido'});
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !key) return res.status(500).json({error:'Falta configurar Supabase en Vercel'});
  const endpoint = `${base.replace(/\/$/,'')}/rest/v1/business_state?id=eq.1`;
  const headers = {'apikey':key,'Authorization':`Bearer ${key}`,'Content-Type':'application/json'};
  try {
    if (req.method === 'GET') {
      const r=await fetch(endpoint+'&select=data,version',{headers});
      const rows=await r.json();
      if(!r.ok) throw Error(JSON.stringify(rows));
      return res.status(200).json(rows[0]||{data:{},version:0});
    }
    const {data, version} = req.body||{};
    if (!data || typeof data!=='object' || Array.isArray(data) || !Number.isSafeInteger(version) || version<0)
      return res.status(400).json({error:'Datos inválidos'});
    if (!['brands','products','sales','shipments','expenses'].every(k=>Array.isArray(data[k])))
      return res.status(400).json({error:'Estructura de inventario inválida'});
    const r=await fetch(endpoint+`&version=eq.${version}&select=version`,{
      method:'PATCH',headers:{...headers,'Prefer':'return=representation'},
      body:JSON.stringify({data,version:version+1,updated_at:new Date().toISOString()})
    });
    const rows=await r.json();
    if(!r.ok) throw Error(JSON.stringify(rows));
    if (!rows.length) return res.status(409).json({error:'Otro dispositivo realizó cambios. Actualiza la página antes de volver a guardar.'});
    return res.status(200).json({version:rows[0].version});
  } catch(e) { console.error('database error',e); return res.status(500).json({error:'Error al consultar la base de datos'}); }
};
