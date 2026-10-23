export function localUrl(value=process.env.WORKSPACE_URL||'http://127.0.0.1:5173'){
 const url=new URL(value);if(url.protocol!=='http:'||!['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.username||url.password)throw Error('Only a local loopback HTTP workspace is supported');return url;
}
export const localHeaders={'content-type':'application/json',cookie:'__sites_local_auth=1'};
