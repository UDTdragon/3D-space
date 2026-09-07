import {execFileSync} from 'node:child_process';
const raw=execFileSync('git',['credential','fill'],{input:'protocol=https\nhost=github.com\n\n',encoding:'utf8',env:{...process.env,GIT_TERMINAL_PROMPT:'0'}});
const fields=Object.fromEntries(raw.trim().split('\n').map(line=>{const i=line.indexOf('=');return[line.slice(0,i),line.slice(i+1)]}));
if(!fields.password)throw Error('GitHub authentication is unavailable');
const headers={Authorization:`Bearer ${fields.password}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'};
const endpoint='https://api.github.com/repos/UDTdragon/3D-space/pages';
let result=await fetch(endpoint,{headers});
if(result.status===404)result=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify({build_type:'workflow'})});
else if(result.ok){const state=await result.json();if(state.build_type!=='workflow')result=await fetch(endpoint,{method:'PUT',headers,body:JSON.stringify({build_type:'workflow'})});else{console.log('Pages already configured:',state.html_url);process.exit(0)}}
const body=await result.json();if(!result.ok)throw Error(`Pages setup failed: HTTP ${result.status}: ${body.message}`);console.log('Pages configured:',body.html_url||'GitHub Actions');
