// ZAEMO backend regression test. Run: node tests/regression.mjs   (Node 18+)
// Creates 3 throw-away users, checks access rules, then deletes them. Needs no secrets (uses the public key).
const U='https://elpjedcgxlcghecjjdhj.supabase.co',K='sb_publishable_E7HXNlytI10Ee44xcrsZug_QK0q7PIx';
const R=[];const ok=(n,c,d='')=>R.push([c,n,d]);
const api=async(p,o={},t)=>{const r=await fetch(U+p,{...o,headers:{apikey:K,'Content-Type':'application/json',Authorization:'Bearer '+(t||K),...(o.headers||{})}});let j=null;try{j=await r.json()}catch{}return{s:r.status,j}};
const mk=async n=>{const r=await api('/auth/v1/signup',{method:'POST',body:JSON.stringify({email:n+'@zaemo.app',password:'Tp'+Math.random().toString(36).slice(2)+'9Z!',data:{username:n}})});return{t:r.j?.access_token,id:r.j?.user?.id,n}};
const sfx=Math.random().toString(36).slice(2,7);
const A=await mk('ta'+sfx),B=await mk('tb'+sfx),C=await mk('tc'+sfx);
ok('users created',!!(A.t&&B.t&&C.t));
let r=await api('/rest/v1/messages?select=id');ok('anon cannot read messages',r.s>=400||(Array.isArray(r.j)&&!r.j.length));
r=await api('/rest/v1/rpc/signup',{method:'POST',body:'{}'},A.t);ok('signup rpc closed',r.s>=400);
for(const u of [A,B,C])await api('/rest/v1/profiles?id=eq.'+u.id,{method:'PATCH',body:JSON.stringify({pubkey:'k'+u.n})},u.t);
r=await api('/rest/v1/rpc/lookup_zid',{method:'POST',body:JSON.stringify({p:B.n})},A.t);ok('lookup works',r.s===200&&r.j?.length===1);
r=await api('/rest/v1/messages',{method:'POST',body:JSON.stringify({sender:A.id,receiver:B.id,body:'c',type:'text'}),headers:{Prefer:'return=representation'}},A.t);ok('send message',r.s===201);const mid=r.j?.[0]?.id;
r=await api('/rest/v1/messages',{method:'POST',body:JSON.stringify({sender:B.id,receiver:A.id,body:'x',type:'text'})},A.t);ok('cannot spoof sender',r.s>=400);
r=await api('/rest/v1/messages?select=id',{},C.t);ok('stranger cannot read',Array.isArray(r.j)&&!r.j.length);
r=await api('/rest/v1/messages?id=eq.'+mid,{method:'PATCH',body:JSON.stringify({body:'h',status:'read'}),headers:{Prefer:'return=representation'}},B.t);ok('receiver cannot edit body',r.j?.[0]?.body==='c');
r=await api('/rest/v1/groups',{method:'POST',body:JSON.stringify({name:'g',created_by:A.id}),headers:{Prefer:'return=representation'}},A.t);const g=r.j?.[0]?.id;ok('create group',!!g);
await api('/rest/v1/group_members',{method:'POST',body:JSON.stringify({group_id:g,user_id:A.id,role:'admin'})},A.t);
r=await api('/rest/v1/group_members',{method:'POST',body:JSON.stringify({group_id:g,user_id:C.id,role:'admin'})},B.t);ok('non-member cannot add admin',r.s>=400);
r=await api('/rest/v1/messages',{method:'POST',body:JSON.stringify({sender:C.id,group_id:g,body:'i',type:'text'})},C.t);ok('non-member cannot post to group',r.s>=400);
const up=(t,p)=>fetch(U+'/storage/v1/object/media/'+p,{method:'POST',headers:{apikey:K,Authorization:'Bearer '+t},body:new Blob(['x'])}).then(x=>x.status);
ok('upload own folder',await up(A.t,A.id+'/t')===200);
ok('cannot upload to other folder',await up(A.t,B.id+'/t')>=400);
let c=0;for(let i=0;i<25;i++){const x=await api('/rest/v1/rpc/lookup_zid',{method:'POST',body:JSON.stringify({p:'zzzzzzzz'})},C.t);if(x.s>=400)c++}ok('lookup rate limit',c>0);
await fetch(U+'/storage/v1/object/media',{method:'DELETE',headers:{apikey:K,Authorization:'Bearer '+A.t,'Content-Type':'application/json'},body:JSON.stringify({prefixes:[A.id+'/t']})});
for(const u of [A,B,C]){const d=await api('/rest/v1/rpc/delete_my_account',{method:'POST',body:'{}'},u.t);ok('cleanup '+u.n,d.s<300)}
for(const [p,n,d] of R)console.log((p?'PASS ':'FAIL ')+n);
process.exit(R.some(x=>!x[0])?1:0);
