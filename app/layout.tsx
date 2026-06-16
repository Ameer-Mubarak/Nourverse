import '@/styles/globals.css';
import { Toaster } from 'sonner';
import SWRegister from './sw-register';
export const metadata = {title:'NOURVERSE',description:'Cinematic Quran Reel Generator'};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang='ar' dir='rtl'><body className='min-h-screen'><SWRegister/><Toaster richColors position='top-center'/>{children}</body></html>;
}
