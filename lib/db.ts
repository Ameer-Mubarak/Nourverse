import { openDB } from 'idb';
import { Project } from './types';
let dbp: ReturnType<typeof openDB> | null = null;
function getDb(){
  if(typeof window==='undefined') throw new Error('DB only in browser');
  if(!dbp){dbp=openDB('nourverse-db',1,{upgrade(db){db.createObjectStore('projects',{keyPath:'id'});}});}return dbp;
}
export const saveProject=async (p:Project)=>(await getDb()).put('projects',p);
export const getProject=async (id:string)=>(await getDb()).get('projects',id) as Promise<Project|undefined>;
