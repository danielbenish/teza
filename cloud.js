'use strict';
window.connectThemaCloud=async function(token,validate){
 const base='https://www.gstatic.com/firebasejs/12.4.0/';
 const [appSdk,authSdk,fs]=await Promise.all([import(base+'firebase-app.js'),import(base+'firebase-auth.js'),import(base+'firebase-firestore.js')]);
 const app=appSdk.getApps()[0]||appSdk.initializeApp(window.THEMA_FIREBASE_CONFIG);
 await authSdk.signInAnonymously(authSdk.getAuth(app));
 const db=fs.getFirestore(app),root=fs.doc(db,'workspaces',token);
 let revision=0,baseline={version:1,posts:[],codes:[]};
 const rev=s=>s.exists()?s.data().revision:0;
 return {
  async load(){
   const before=await fs.getDocFromServer(root);
   const [posts,codes]=await Promise.all(['posts','codes'].map(name=>fs.getDocsFromServer(fs.collection(root,name))));
   const after=await fs.getDocFromServer(root);
   if(rev(before)!==rev(after))throw Error('המידע השתנה בזמן הטעינה. נסו שוב.');
   const value={version:1,posts:posts.docs.map(d=>d.data()),codes:codes.docs.map(d=>d.data())};
   if(!validate(value))throw Error('מבנה הנתונים בענן אינו תקין');
   revision=rev(after);baseline=structuredClone(value);return value;
  },
  async save(next){
   if(!validate(next))throw Error('הנתונים אינם תקינים');
   const changes=[];
   for(const kind of ['posts','codes']){
    const old=new Map(baseline[kind].map(item=>[item.id,item]));
    for(const item of next[kind]){
     if(!/^[a-zA-Z0-9_-]{1,128}$/.test(item.id))throw Error('מזהה רשומה אינו תקין');
     if(JSON.stringify(item)!==JSON.stringify(old.get(item.id)))changes.push({ref:fs.doc(root,kind,item.id),value:item});
     old.delete(item.id);
    }
    for(const id of old.keys())changes.push({ref:fs.doc(root,kind,id),remove:true});
   }
   if(changes.length>450)throw Error('ניתן להעביר עד 450 רשומות שהשתנו בכל פעולה');
   await fs.runTransaction(db,async tx=>{
    const current=await tx.get(root);
    if(rev(current)!==revision){const e=Error('המידע השתנה במכשיר אחר');e.code='conflict';throw e}
    for(const c of changes){if(c.remove)tx.delete(c.ref);else tx.set(c.ref,c.value)}
    tx.set(root,{revision:revision+1,updatedAt:fs.serverTimestamp()});
   });
   revision++;baseline=structuredClone(next);
  }
 };
};
