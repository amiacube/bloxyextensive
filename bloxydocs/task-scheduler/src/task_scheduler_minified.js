// Task Scheduler v2026-03-11-0001
// Copyright (c) 2025-2026 delfineonx, chmod, FrostyCaveman
// SPDX-License-Identifier: Apache-2.0

{
let A={currentTick:0,noTask:Object.freeze(()=>{})},B=[{str:"",style:{color:"#FF775E",fontWeight:"500",fontSize:"0.95rem"}}],C="default",D=Object.create(null),E=Object.create(null),F=Object.create(null),G=1,H=0,I=0,J=1,K=2,L=!1;
const M=a=>{B[0].str="Task Scheduler "+a;api.broadcastMessage(B);B[0].str=""};
A.run=(a,b,c)=>{c??=C;b=(b|0)*.02|0;b=b&~(b>>31);let d=H+b+(!b&J),e=D[d],f=E[c],g=2;if(!e&&b){if(f===void 0){f=1;F[c]=1}else if(~f&1){f++}D[d]=[a,c,++G];E[c]=f+2}else if(e&&b){if(f===void 0){f=1;F[c]=1}else if(~f&1){f++}g=e.length-1;e[++g]=a;e[++g]=c;e[++g]=++G;E[c]=f+2}else if(!e&&!b){if(f===void 0){f=1;F[c]=1}else if(~f&1){f++}e=D[d]=[a,c,++G];E[c]=f+2;try{a();e[2]=1}catch(_){e[2]=1;M("["+c+"]: "+_.name+": "+_.message+".")}}else{if(f===void 0){f=1;F[c]=1}else if(~f&1){f++}g=e.length-1;e[++g]=a;e[++g]=c;e[++g]=++G;E[c]=f+2;try{a();e[g]=1}catch(_){e[g]=1;M("["+c+"]: "+_.name+": "+_.message+".")}}return[d,g]};
A.stop=a=>{a??=C;if(E[a]&1){E[a]--;F[a]=++G;return!0}return!1};
A.isGroupActive=a=>{a??=C;return!!(E[a]&1)};
A.cancel=a=>{let b=D[a[0]],c=a[1]>>>0;if(!b||c>=b.length){return!1}b[c]=1;return!0};
A.isTaskActive=a=>{let b=D[a[0]],c=a[1]>>>0;if(!b||c>=b.length){return!1}return b[c]>F[b[c-1]]};
A.getGroupId=a=>{let b=D[a[0]],c=a[1]>>>0;if(!b||c>=b.length){return null}return b[c-1]};
A.tick=()=>{A.currentTick=H+=J;let a=D[H];J=0;if(a){let b,c;do{try{while(c=a[I+2]){b=a[I+1];if(K&2){L=c>F[b];E[b]-=2;K=1}if(L&K){a[I]()}K=4;if(E[b]<2){delete E[b];delete F[b]}K=2;I+=3}delete D[H];I=0;break}catch(_){K=4;if(E[b]<2){delete E[b];delete F[b]}K=2;I+=3;M("["+b+"]: "+_.name+": "+_.message+".")}}while(!0)}J=1};
Object.seal(A);
globalThis.TS=A;
void 0
}

