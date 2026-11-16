import {useEffect,useState} from 'react';
import {getStudentData} from '../api-client/studentClasses';
export function useStudentResource<T>(path:string|null) {
 const [attempt,setAttempt]=useState(0);
 const [response,setResponse]=useState<{path:string;attempt:number;data?:T;error?:string}>();
 useEffect(()=>{if(!path)return;const c=new AbortController();
  getStudentData<T>(path,c.signal).then(data=>{if(!c.signal.aborted)setResponse({path,attempt,data});},error=>{
   if(!c.signal.aborted)setResponse({path,attempt,error:error instanceof Error?error.message:'Không thể tải dữ liệu.'});
  });return()=>c.abort();
 },[path,attempt]);
 const current=response?.path===path&&response.attempt===attempt?response:undefined;
 return {data:current?.data,error:current?.error,loading:!!path&&!current,retry:()=>setAttempt(n=>n+1)};
}
