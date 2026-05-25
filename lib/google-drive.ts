const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

async function ensureGIS() {
  if ((window as any).google?.accounts?.oauth2) return;
  await new Promise<void>((resolve) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => resolve();
    document.body.appendChild(s);
  });
}

export async function getDriveToken() {
  await ensureGIS();
  return new Promise<string>((resolve, reject) => {
    // @ts-expect-error google loaded at runtime
    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp: any) => (resp.access_token ? resolve(resp.access_token) : reject(new Error('OAuth failed'))),
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export async function uploadToDriveResumable(file: Blob, name: string) {
  const token = await getDriveToken();
  const session = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4',
    },
    body: JSON.stringify({ name, mimeType: 'video/mp4' }),
  });
  const location = session.headers.get('Location');
  if (!location) throw new Error('Resumable session failed');

  return fetch(location, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'video/mp4',
    },
    body: file,
  }).then((r) => r.json());
}

export async function listDriveFiles() {
  const token = await getDriveToken();
  return fetch('https://www.googleapis.com/drive/v3/files?pageSize=10&fields=files(id,name,webViewLink,webContentLink)', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
}
