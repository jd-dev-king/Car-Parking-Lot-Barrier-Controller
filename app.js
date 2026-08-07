import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (id) => document.getElementById(id);
const bool = (v) => v ? 'TRUE' : 'FALSE';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const API_BASE = (window.EES_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

function log(type, message, cls='') {
  const row = document.createElement('div');
  row.className = `event ${cls}`;
  row.innerHTML = `<time>${new Date().toLocaleTimeString([], {hour12:false})}</time><b>${type}</b><span>${message}</span>`;
  $('log').prepend(row);
  while ($('log').children.length > 60) $('log').lastElementChild.remove();
}

async function api(path, options={}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {'Content-Type': 'application/json', ...(options.headers || {})},
    ...options,
  });
  let body = {};
  try { body = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error(body.detail || body.message || `API ${response.status}`);
  return body;
}

class Parking3D {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06101a);
    this.scene.fog = new THREE.Fog(0x06101a, 65, 170);
    this.camera = new THREE.PerspectiveCamera(45, 1, .1, 300);
    this.camera.position.set(62, 62, 72);
    this.renderer = new THREE.WebGLRenderer({antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0,0,0);
    this.controls.maxPolarAngle = Math.PI/2.05;
    this.controls.minDistance = 28;
    this.controls.maxDistance = 145;
    this.spots=[]; this.carMap=new Map(); this.animations=[];
    this.build(); this.resize();
    addEventListener('resize',()=>this.resize());
    this.renderer.setAnimationLoop(()=>this.render());
  }
  mat(color, emissive=0, intensity=0){return new THREE.MeshStandardMaterial({color,roughness:.56,metalness:.32,emissive,emissiveIntensity:intensity});}
  add(geo,mat,pos){const m=new THREE.Mesh(geo,mat);m.position.copy(pos);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m;}
  build(){
    this.scene.add(new THREE.HemisphereLight(0xa9e5ff,0x18202a,2.3));
    const sun=new THREE.DirectionalLight(0xffffff,3.7);sun.position.set(45,70,38);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-70;sun.shadow.camera.right=70;sun.shadow.camera.top=70;sun.shadow.camera.bottom=-70;this.scene.add(sun);
    const glow=new THREE.PointLight(0x29cfff,55,95);glow.position.set(-42,15,-20);this.scene.add(glow);
    this.add(new THREE.BoxGeometry(82,.8,80),this.mat(0x202a34),new THREE.Vector3(0,-.5,0));
    const curb=this.mat(0x697680);
    this.add(new THREE.BoxGeometry(84,.7,1),curb,new THREE.Vector3(0,0,-40));
    this.add(new THREE.BoxGeometry(84,.7,1),curb,new THREE.Vector3(0,0,40));
    this.add(new THREE.BoxGeometry(1,.7,81),curb,new THREE.Vector3(-42,0,0));
    this.add(new THREE.BoxGeometry(1,.7,81),curb,new THREE.Vector3(42,0,0));
    this.buildSpots();
    this.entryGate=this.gate(-17,36.2,'ENTRY');
    this.exitGate=this.gate(17,36.2,'EXIT');
  }
  buildSpots(){
    const line=new THREE.MeshBasicMaterial({color:0x59d0ff});
    const rowLetters='ABCDEFG';
    for(let r=0;r<7;r++){
      for(let c=0;c<10;c++){
        const x=-27+c*6;
        const z=-30+r*9.3;
        const number=`${rowLetters[r]}${String(c+1).padStart(2,'0')}`;
        const g=new THREE.Mesh(new THREE.PlaneGeometry(4.6,7.2),new THREE.MeshStandardMaterial({color:0x11364c,emissive:0x1ca9e0,emissiveIntensity:.25,transparent:true,opacity:.48}));
        g.rotation.x=-Math.PI/2;g.position.set(x,.02,z);this.scene.add(g);
        [-2.35,2.35].forEach(dx=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.09,.03,7.3),line);l.position.set(x+dx,.05,z);this.scene.add(l);});
        this.spots.push({x,z,rot:r%2===0?0:Math.PI,glow:g,occupied:false,number});
      }
    }
  }
  gate(x,z,label){
    const group=new THREE.Group();group.position.set(x,0,z);
    const post=new THREE.Mesh(new THREE.BoxGeometry(1.1,3,1.1),this.mat(0x263b4c,0x117aa7,.25));post.position.y=1.5;group.add(post);
    const pivot=new THREE.Group();pivot.position.set(0,2.55,0);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(7,.26,.34),this.mat(0xf5f7f9));arm.position.x=x<0?3.5:-3.5;pivot.add(arm);
    for(let i=0;i<6;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(.62,.28,.36),this.mat(0xff3659,0xff193f,.65));s.position.x=(x<0?1:-1)*(.65+i*1.1);pivot.add(s);}
    group.add(pivot);this.scene.add(group);return {group,pivot,target:0,label};
  }
  car(color, visitor=false){
    const g=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(2.5,.72,4.5),this.mat(color));body.position.y=.72;g.add(body);
    const cab=new THREE.Mesh(new THREE.BoxGeometry(1.9,.68,2.2),new THREE.MeshStandardMaterial({color:visitor?0xffd58a:0x8edfff,transparent:true,opacity:.74,roughness:.18,metalness:.4}));cab.position.set(0,1.4,-.15);g.add(cab);
    [[-1.15,.45,1.4],[1.15,.45,1.4],[-1.15,.45,-1.4],[1.15,.45,-1.4]].forEach(p=>{const w=new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.28,16),this.mat(0x080b0e));w.rotation.z=Math.PI/2;w.position.set(...p);g.add(w);});return g;
  }
  colorFor(id, visitor=false){if(visitor)return 0xffa93f;let h=0;for(const ch of id)h=(h*31+ch.charCodeAt(0))>>>0;const colors=[0x2e7cff,0x40f6a1,0xffca55,0x9b7dff,0x38c3c8,0xf07dc4,0x8ac24a,0xd8e1ea];return colors[h%colors.length];}
  spot(number){return this.spots.find(s=>s.number===number);}
  async gateTo(g,open){g.target=open?(g.group.position.x<0?-Math.PI/2:Math.PI/2):0;await sleep(650);}
  move(obj,points,duration){return new Promise(resolve=>{const start=performance.now(),path=[obj.position.clone(),...points];this.animations.push(now=>{const p=Math.min(1,(now-start)/duration),n=path.length-1,s=p*n,i=Math.min(n-1,Math.floor(s)),t=s-i,e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;obj.position.lerpVectors(path[i],path[i+1],e);if(p>=1){resolve();return true}return false});});}
  parkImmediate(session){
    if(this.carMap.has(session.vehicle_identifier))return;
    const spot=this.spot(session.spot_number);if(!spot)return;
    const visitor=session.occupant_type==='VISITOR';const car=this.car(this.colorFor(session.vehicle_identifier,visitor),visitor);car.position.set(spot.x,0,spot.z);car.rotation.y=spot.rot;this.scene.add(car);spot.occupied=true;spot.glow.material.color.setHex(visitor?0x5b3510:0x173c26);spot.glow.material.emissive.setHex(visitor?0xffa62b:0x40f6a1);this.carMap.set(session.vehicle_identifier,{mesh:car,spot,visitor});
  }
  syncSessions(sessions){
    const active=new Set(sessions.map(s=>s.vehicle_identifier));
    for(const [id,item] of this.carMap){if(!active.has(id)){this.scene.remove(item.mesh);item.spot.occupied=false;item.spot.glow.material.color.setHex(0x11364c);item.spot.glow.material.emissive.setHex(0x1ca9e0);this.carMap.delete(id);}}
    sessions.forEach(s=>this.parkImmediate(s));
  }
  async enter(vehicleId, spotNumber, occupantType){
    if(this.carMap.has(vehicleId))return;
    const spot=this.spot(spotNumber);if(!spot)return;
    await this.gateTo(this.entryGate,true);
    const visitor=occupantType==='VISITOR';const car=this.car(this.colorFor(vehicleId,visitor),visitor);car.position.set(-17,0,45);this.scene.add(car);
    await this.move(car,[new THREE.Vector3(-17,0,28),new THREE.Vector3(-17,0,0),new THREE.Vector3(spot.x,0,spot.z)],2600);
    car.rotation.y=spot.rot;spot.occupied=true;spot.glow.material.color.setHex(visitor?0x5b3510:0x173c26);spot.glow.material.emissive.setHex(visitor?0xffa62b:0x40f6a1);this.carMap.set(vehicleId,{mesh:car,spot,visitor});
    await this.gateTo(this.entryGate,false);
  }
  async exit(vehicleId){
    const item=this.carMap.get(vehicleId);if(!item)return;
    await this.gateTo(this.exitGate,true);
    await this.move(item.mesh,[new THREE.Vector3(17,0,0),new THREE.Vector3(17,0,30),new THREE.Vector3(17,0,47)],2400);
    this.scene.remove(item.mesh);item.spot.occupied=false;item.spot.glow.material.color.setHex(0x11364c);item.spot.glow.material.emissive.setHex(0x1ca9e0);this.carMap.delete(vehicleId);await this.gateTo(this.exitGate,false);
  }
  cameraView(v){const views={overview:[[62,62,72],[0,0,0]],entry:[[-34,14,52],[-17,2,29]],exit:[[34,14,52],[17,2,29]]};const [p,t]=views[v]||views.overview;this.camera.position.set(...p);this.controls.target.set(...t);this.controls.update();}
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;this.camera.aspect=w/Math.max(h,1);this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
  render(){const now=performance.now();this.animations=this.animations.filter(fn=>!fn(now));[this.entryGate,this.exitGate].forEach(g=>{if(g)g.pivot.rotation.z+=(g.target-g.pivot.rotation.z)*.12});this.controls.update();this.renderer.render(this.scene,this.camera);}
}

class SecurePLC {
  constructor(scene){
    this.scene=scene;this.scanCount=0;this.estop=false;this.busy=false;this.entryGate=false;this.exitGate=false;
    this.tags={Vehicle_Detected:false,Employee_Vehicle:false,Visitor_Vehicle:false,Vehicle_Authorized:false,Security_Approval:false};
    this.status={capacity:70,occupied:0,employees:0,visitors:0,remaining:70,full:false,empty:true,visitor_pool_available:0,active_sessions:[]};
    setInterval(()=>this.scan(),100);this.scan();
  }
  scan(){this.scanCount++;$('scan-count').textContent=this.scanCount.toLocaleString();$('entry-gate').textContent=this.entryGate?'OPEN':'CLOSED';$('exit-gate').textContent=this.exitGate?'OPEN':'CLOSED';$('t-entry-gate').textContent=bool(this.entryGate);$('t-exit-gate').textContent=bool(this.exitGate);$('t-detected').textContent=bool(this.tags.Vehicle_Detected);$('t-employee').textContent=bool(this.tags.Employee_Vehicle);$('t-visitor').textContent=bool(this.tags.Visitor_Vehicle);$('t-authorized').textContent=bool(this.tags.Vehicle_Authorized);$('t-security').textContent=bool(this.tags.Security_Approval);}
  clearDecisionTags(){this.tags.Vehicle_Detected=false;this.tags.Employee_Vehicle=false;this.tags.Visitor_Vehicle=false;this.tags.Vehicle_Authorized=false;this.tags.Security_Approval=false;}
  async animateEntry(result){this.busy=true;this.entryGate=true;this.scan();await this.scene.enter(result.vehicle_identifier,result.spot_number,result.occupant_type);this.entryGate=false;this.busy=false;this.clearDecisionTags();this.scan();}
  async animateExit(result){this.busy=true;this.exitGate=true;this.scan();await this.scene.exit(result.vehicle_identifier);this.exitGate=false;this.busy=false;this.clearDecisionTags();this.scan();}
  toggleEstop(){this.estop=!this.estop;if(this.estop){this.entryGate=false;this.exitGate=false;log('ALARM','Emergency stop activated. Gate authorization outputs inhibited.','alarm');}else log('RESET','Emergency stop released.');$('estop').classList.toggle('active',this.estop);this.scan();}
}

const scene=new Parking3D($('scene'));
const plc=new SecurePLC(scene);
let pendingRequest=null;

function setAccessResult(state,title,message){const el=$('access-result');el.className=`access-result ${state||''}`;el.querySelector('strong').textContent=title;el.querySelector('p').textContent=message;}
function vehicleId(){return $('vehicle-id').value.trim().toUpperCase();}
function setBusy(value){plc.busy=value;$('detect-entry').disabled=value;$('detect-exit').disabled=value;$('approve-visitor').disabled=value;$('deny-visitor').disabled=value;}
function updateStatus(s){
  plc.status=s;$('count').textContent=s.occupied;$('employee-count').textContent=s.employees;$('visitor-count').textContent=s.visitors;$('remaining').textContent=`${s.remaining} ${s.remaining===1?'space':'spaces'} available`;$('meter-fill').style.width=`${Math.min(100,s.occupied/s.capacity*100)}%`;$('full').textContent=bool(s.full);$('empty').textContent=bool(s.empty);$('t-count').textContent=s.occupied;$('t-remaining').textContent=s.remaining;$('visitor-pool').textContent=String(s.visitor_pool_available);
  $('lot-state').textContent=s.full?'LOT FULL':s.empty?'LOT EMPTY':'SECURE ACCESS';$('lot-state').style.color=s.full?'var(--red)':s.empty?'var(--green)':'var(--cyan)';
  scene.syncSessions(s.active_sessions||[]);
}
async function refreshStatus(){try{const s=await api('/api/parking/status');updateStatus(s);$('db-state').textContent='ONLINE';$('api-chip').textContent='● API + DB ONLINE';$('api-chip').className='chip api-online';}catch(err){$('db-state').textContent='OFFLINE';$('api-chip').textContent='● API OFFLINE';$('api-chip').className='chip api-offline';}}
async function health(){try{const h=await api('/api/health');$('api-chip').textContent=`● ${h.database} ONLINE`;$('api-chip').className='chip api-online';$('db-state').textContent='ONLINE';log('DB',`Connected to PostgreSQL database ${h.database}.`);await refreshStatus();await refreshSecurity();}catch(err){$('api-chip').textContent='● API OFFLINE';$('api-chip').className='chip api-offline';$('db-state').textContent='OFFLINE';setAccessResult('denied','API OFFLINE',`Start the FastAPI service at ${API_BASE}.`);log('ERROR',err.message,'alarm');}}
async function detectEntry(){
  const id=vehicleId();if(!id)return setAccessResult('denied','IDENTIFIER REQUIRED','Enter or select a vehicle identifier.');if(plc.estop)return setAccessResult('denied','E-STOP ACTIVE','Release emergency stop before processing access.');
  setBusy(true);plc.tags.Vehicle_Detected=true;$('state-text').textContent='Checking vehicle against ees_data_platform…';log('DETECT',`${id} detected at employee-lot entrance.`);
  try{
    const result=await api('/api/access/entry',{method:'POST',body:JSON.stringify({vehicle_identifier:id})});
    if(result.decision==='GRANTED'){
      plc.tags.Employee_Vehicle=result.occupant_type==='EMPLOYEE';plc.tags.Visitor_Vehicle=result.occupant_type==='VISITOR';plc.tags.Vehicle_Authorized=true;setAccessResult('granted','ACCESS GRANTED',`${result.occupant_type} assigned ${result.spot_number}. Gate opening automatically.`);$('state-text').textContent=`Access granted — ${result.spot_number}`;log('GRANTED',`${id} authorized for ${result.spot_number}.`);setBusy(false);await plc.animateEntry(result);await refreshStatus();
    }else if(result.decision==='SECURITY_REVIEW'){
      plc.tags.Visitor_Vehicle=true;pendingRequest=result;setAccessResult('pending','SECURITY REVIEW',`Unknown vehicle. Request ${result.security_request_id} sent to Security; gate remains closed.`);$('state-text').textContent='Visitor waiting for Security approval';log('VISITOR',`${id} requires Security approval.`,'warning');showPending(result);setBusy(false);await refreshSecurity();
    }
  }catch(err){setBusy(false);plc.clearDecisionTags();setAccessResult('denied','ACCESS ERROR',err.message);$('state-text').textContent='Access request failed';log('ERROR',err.message,'alarm');}
}
async function detectExit(){
  const id=vehicleId();if(!id)return setAccessResult('denied','IDENTIFIER REQUIRED','Enter or select the exiting vehicle identifier.');if(plc.estop)return setAccessResult('denied','E-STOP ACTIVE','Release emergency stop before processing exit.');
  setBusy(true);plc.tags.Vehicle_Detected=true;$('state-text').textContent='Closing parking session…';log('EXIT',`${id} detected at exit.`);
  try{const result=await api('/api/access/exit',{method:'POST',body:JSON.stringify({vehicle_identifier:id})});setAccessResult('granted','EXIT AUTHORIZED',result.visitor_pass_code?`${result.visitor_pass_code} quarantined until ${new Date(result.reusable_after).toLocaleString()}.`:'Parking session closed. Exit gate opening.');$('state-text').textContent='Exit authorized';setBusy(false);await plc.animateExit(result);log('EXIT',`${id} exited; ${result.spot_number} released.`);await refreshStatus();}
  catch(err){setBusy(false);plc.clearDecisionTags();setAccessResult('denied','EXIT DENIED',err.message);$('state-text').textContent='Exit lookup failed';log('ERROR',err.message,'alarm');}
}
function showPending(req){$('security-empty').classList.add('hidden');$('security-request').classList.remove('hidden');$('security-vehicle').textContent=req.vehicle_identifier;$('security-request-id').textContent=`Request ${req.security_request_id}`;$('pending-count').textContent='1 PENDING';}
function hidePending(){pendingRequest=null;$('security-empty').classList.remove('hidden');$('security-request').classList.add('hidden');$('pending-count').textContent='0 PENDING';}
async function refreshSecurity(){try{const data=await api('/api/security/requests?status=PENDING');$('pending-count').textContent=`${data.length} PENDING`;if(data.length){pendingRequest=data[0];showPending(data[0]);}else hidePending();}catch(_) {}}
async function approveVisitor(){if(!pendingRequest)return; if(plc.estop)return setAccessResult('denied','E-STOP ACTIVE','Release emergency stop before Security approval.');setBusy(true);try{const result=await api(`/api/security/requests/${pendingRequest.security_request_id}/approve`,{method:'POST',body:JSON.stringify({security_user:'SECURITY-DEMO'})});plc.tags.Security_Approval=true;plc.tags.Visitor_Vehicle=true;plc.tags.Vehicle_Authorized=true;setAccessResult('granted','VISITOR APPROVED',`${result.visitor_pass_code} issued. Visitor assigned ${result.spot_number}.`);$('vehicle-id').value=result.vehicle_identifier;log('SECURITY',`${result.vehicle_identifier} approved; ${result.visitor_pass_code} issued.`);hidePending();setBusy(false);await plc.animateEntry(result);await refreshStatus();await refreshSecurity();}catch(err){setBusy(false);setAccessResult('denied','APPROVAL FAILED',err.message);log('ERROR',err.message,'alarm');}}
async function denyVisitor(){if(!pendingRequest)return;setBusy(true);try{await api(`/api/security/requests/${pendingRequest.security_request_id}/deny`,{method:'POST',body:JSON.stringify({security_user:'SECURITY-DEMO',notes:'Denied from simulator HMI'})});setAccessResult('denied','ACCESS DENIED',`${pendingRequest.vehicle_identifier} denied by Security.`);log('SECURITY',`${pendingRequest.vehicle_identifier} denied.`,'warning');hidePending();plc.clearDecisionTags();setBusy(false);await refreshSecurity();}catch(err){setBusy(false);log('ERROR',err.message,'alarm');}}

$('detect-entry').addEventListener('click',detectEntry);$('detect-exit').addEventListener('click',detectExit);$('approve-visitor').addEventListener('click',approveVisitor);$('deny-visitor').addEventListener('click',denyVisitor);$('estop').addEventListener('click',()=>plc.toggleEstop());$('clear-vehicle').addEventListener('click',()=>{$('vehicle-id').value='';$('vehicle-id').focus();});$('clear-log').addEventListener('click',()=>{$('log').innerHTML='';log('SYSTEM','Event buffer cleared.');});
document.querySelectorAll('[data-vehicle]').forEach(b=>b.addEventListener('click',()=>{$('vehicle-id').value=b.dataset.vehicle;}));document.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>scene.cameraView(b.dataset.camera)));
$('vehicle-id').addEventListener('keydown',e=>{if(e.key==='Enter')detectEntry();});

log('SYSTEM','Secure parking PLC initialized with 70-space digital twin.');log('SYSTEM',`API endpoint: ${API_BASE}`);health();setInterval(refreshStatus,10000);setInterval(refreshSecurity,12000);
