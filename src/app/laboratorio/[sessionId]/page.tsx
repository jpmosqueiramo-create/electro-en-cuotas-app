import OperationsLabReader from '@/components/operations/OperationsLabReader';
export default async function Page({params,searchParams}:{params:Promise<{sessionId:string}>;searchParams:Promise<{owner?:string}>}){
 const {sessionId}=await params,{owner}=await searchParams;
 return <OperationsLabReader sessionId={sessionId} owner={owner??''}/>;
}
