const CLIENT_ID=process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const SCOPES='https://www.googleapis.com/auth/drive.file';
export async function getDriveToken(){
  await new Promise<void>((r)=>{const s=document.createElement('script');s.src='https://accounts.google.com/gsi/client';s.onload=()=>r();document.body.appendChild(s);});
  return await new Promise<string>((resolve,reject)=>{
    // @ts-expect-error
    const tokenClient=google.accounts.oauth2.initTokenClient({client_id:CLIENT_ID,scope:SCOPES,callback:(resp:any)=>resp.access_token?resolve(resp.access_token):reject(new Error('OAuth failed'))});
    tokenClient.requestAccessToken({prompt:'consent'});
  });
}
export async function uploadToDrive(file:Blob,name:string){
  const token=await getDriveToken();
  const meta={name,mimeType:'video/mp4'};
  const form=new FormData();
  form.append('metadata',new Blob([JSON.stringify(meta)],{type:'application/json'}));
  form.append('file',file);
  return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form}).then(r=>r.json());
}
