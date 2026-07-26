import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const $ = (id) => document.getElementById(id);
const bool = (v) => v ? 'TRUE' : 'FALSE';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function log(type, message, cls='') {
  const row = document.createElement('div');
  row.className = `event ${cls}`;
  row.innerHTML = `<time>${new Date().toLocaleTimeString([], {hour12:false})}</time><b>${type}</b><span>${message}</span>`;
  $('log').prepend(row);
  while ($('log').children.length > 50) $('log').lastElementChild.remove();
}

class Parking3D {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x06101a);
    this.scene.fog = new THREE.Fog(0x06101a, 35, 85);
    this.camera = new THREE.PerspectiveCamera(48, 1, .1, 200);
    this.camera.position.set(24, 25, 31);
    this.renderer = new THREE.WebGLRenderer({antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.target.set(0,0,0);
    this.controls.maxPolarAngle = Math.PI/2.08;
    this.controls.minDistance = 14;
    this.controls.maxDistance = 65;
    this.spots=[]; this.cars=[]; this.animations=[];
    this.build(); this.resize();
    addEventListener('resize',()=>this.resize());
    this.renderer.setAnimationLoop(()=>this.render());
  }
  mat(color, emissive=0, intensity=0){return new THREE.MeshStandardMaterial({color,roughness:.55,metalness:.35,emissive,emissiveIntensity:intensity});}
  add(geo,mat,pos){const m=new THREE.Mesh(geo,mat);m.position.copy(pos);m.castShadow=true;m.receiveShadow=true;this.scene.add(m);return m;}
  build(){
    this.scene.add(new THREE.HemisphereLight(0xa9e5ff,0x18202a,2.4));
    const sun=new THREE.DirectionalLight(0xffffff,3.6);sun.position.set(18,30,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);this.scene.add(sun);
    const glow=new THREE.PointLight(0x29cfff,35,42);glow.position.set(-15,8,-8);this.scene.add(glow);
    this.add(new THREE.BoxGeometry(34,.8,30),this.mat(0x202a34),new THREE.Vector3(0,-.5,0));
    const curb=this.mat(0x697680);this.add(new THREE.BoxGeometry(36,.7,1),curb,new THREE.Vector3(0,0,-15));this.add(new THREE.BoxGeometry(36,.7,1),curb,new THREE.Vector3(0,0,15));this.add(new THREE.BoxGeometry(1,.7,31),curb,new THREE.Vector3(-17.5,0,0));this.add(new THREE.BoxGeometry(1,.7,31),curb,new THREE.Vector3(17.5,0,0));
    this.buildSpots();this.entryGate=this.gate(-11.5,12.3,'ENTRY');this.exitGate=this.gate(11.5,12.3,'EXIT');
  }
  buildSpots(){
    const line=new THREE.MeshBasicMaterial({color:0x59d0ff});
    for(let r=0;r<2;r++)for(let c=0;c<5;c++){
      const x=-10+c*5,z=r===0?-8:5,rot=r===0?0:Math.PI;
      const g=new THREE.Mesh(new THREE.PlaneGeometry(3.6,5.7),new THREE.MeshStandardMaterial({color:0x11364c,emissive:0x1ca9e0,emissiveIntensity:.3,transparent:true,opacity:.55}));g.rotation.x=-Math.PI/2;g.position.set(x,.02,z);this.scene.add(g);
      [-1.85,1.85].forEach(dx=>{const l=new THREE.Mesh(new THREE.BoxGeometry(.09,.03,5.8),line);l.position.set(x+dx,.05,z);this.scene.add(l);});
      this.spots.push({x,z,rot,glow:g,occupied:false});
    }
  }
  gate(x,z,label){
    const group=new THREE.Group();group.position.set(x,0,z);
    const post=new THREE.Mesh(new THREE.BoxGeometry(.9,2.5,.9),this.mat(0x263b4c,0x117aa7,.25));post.position.y=1.25;group.add(post);
    const pivot=new THREE.Group();pivot.position.set(0,2.15,0);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(5.2,.22,.3),this.mat(0xf5f7f9));arm.position.x=x<0?2.6:-2.6;pivot.add(arm);
    for(let i=0;i<5;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(.55,.24,.32),this.mat(0xff3659,0xff193f,.65));s.position.x=(x<0?1:-1)*(.6+i*1.05);pivot.add(s);}
    group.add(pivot);this.scene.add(group);return {group,pivot,target:0,label};
  }
  car(color){
    const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(2.1,.65,3.8),this.mat(color));body.position.y=.65;g.add(body);
    const cab=new THREE.Mesh(new THREE.BoxGeometry(1.65,.62,1.9),new THREE.MeshStandardMaterial({color:0x8edfff,transparent:true,opacity:.72,roughness:.18,metalness:.4}));cab.position.set(0,1.22,-.1);g.add(cab);
    [[-1,.42,1.2],[1,.42,1.2],[-1,.42,-1.2],[1,.42,-1.2]].forEach(p=>{const w=new THREE.Mesh(new THREE.CylinderGeometry(.34,.34,.24,16),this.mat(0x080b0e));w.rotation.z=Math.PI/2;w.position.set(...p);g.add(w);});return g;
  }
  async gateTo(g,open){g.target=open?(g.group.position.x<0?-Math.PI/2:Math.PI/2):0;await sleep(650);}
  move(obj,points,duration){return new Promise(resolve=>{const start=performance.now(),path=[obj.position.clone(),...points];this.animations.push(now=>{const p=Math.min(1,(now-start)/duration),n=path.length-1,s=p*n,i=Math.min(n-1,Math.floor(s)),t=s-i,e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;obj.position.lerpVectors(path[i],path[i+1],e);if(p>=1){resolve();return true}return false});});}
  async enter(){const spot=this.spots.find(s=>!s.occupied);if(!spot)return;await this.gateTo(this.entryGate,true);const colors=[0x2e7cff,0x40f6a1,0xffca55,0xff506d,0x9b7dff,0x38c3c8,0xf07dc4,0x8ac24a,0xff8d4d,0xd8e1ea];const car=this.car(colors[this.cars.length%10]);car.position.set(-10,0,18);this.scene.add(car);this.cars.push({mesh:car,spot});await this.move(car,[new THREE.Vector3(-10,0,5),new THREE.Vector3(-10,0,0),new THREE.Vector3(spot.x,0,spot.z)],2500);car.rotation.y=spot.rot;spot.occupied=true;spot.glow.material.color.setHex(0x4b2a0b);spot.glow.material.emissive.setHex(0xffa62b);await this.gateTo(this.entryGate,false);}
  async exit(){const item=this.cars.at(-1);if(!item)return;await this.gateTo(this.exitGate,true);await this.move(item.mesh,[new THREE.Vector3(10,0,0),new THREE.Vector3(10,0,9),new THREE.Vector3(10,0,19)],2400);this.scene.remove(item.mesh);this.cars.pop();item.spot.occupied=false;item.spot.glow.material.color.setHex(0x11364c);item.spot.glow.material.emissive.setHex(0x1ca9e0);await this.gateTo(this.exitGate,false);}
  reset(){while(this.cars.length){const i=this.cars.pop();this.scene.remove(i.mesh);i.spot.occupied=false;i.spot.glow.material.color.setHex(0x11364c);i.spot.glow.material.emissive.setHex(0x1ca9e0);}}
  cameraView(v){const views={overview:[[24,25,31],[0,0,0]],entry:[[-19,9,20],[-10,1,8]],exit:[[19,9,20],[10,1,8]]};const [p,t]=views[v]||views.overview;this.camera.position.set(...p);this.controls.target.set(...t);this.controls.update();}
  resize(){const w=this.container.clientWidth,h=this.container.clientHeight;this.camera.aspect=w/Math.max(h,1);this.camera.updateProjectionMatrix();this.renderer.setSize(w,h,false);}
  render(){const now=performance.now();this.animations=this.animations.filter(fn=>!fn(now));[this.entryGate,this.exitGate].forEach(g=>{if(g)g.pivot.rotation.z+=(g.target-g.pivot.rotation.z)*.12});this.controls.update();this.renderer.render(this.scene,this.camera);}
}

class PLC {
  constructor(scene) {
    this.scene = scene;
    this.count = 0;
    this.max = 10;
    this.mode = 'MANUAL';
    this.estop = false;
    this.busy = false;
    this.scanCount = 0;
    this.autoDirection = 'FILL';
    this.autoIntervalMs = 4200;
    this.autoTimer = null;

    this.inputs = {
      Entry_Sensor: false,
      Exit_Sensor: false,
      Entry_HMI: false,
      Exit_HMI: false,
      Reset_Count: false,
      Reset_HMI: false
    };

    this.prev = {
      Entry_Request: false,
      Exit_Request: false,
      Reset_Request: false
    };

    this.entryGate = false;
    this.exitGate = false;

    setInterval(() => this.scan(), 100);
    this.scan();
  }


  startAutoCycle(delay = 900) {
    this.stopAutoCycle();
    if (this.mode !== 'AUTO') return;

    log('AUTO', 'Automatic sensor sequence armed.');
    this.scheduleAutoStep(delay);
  }

  stopAutoCycle() {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }

  scheduleAutoStep(delay = this.autoIntervalMs) {
    this.stopAutoCycle();
    if (this.mode !== 'AUTO') return;

    this.autoTimer = setTimeout(() => {
      this.autoTimer = null;
      this.autoStep();
    }, delay);
  }

  autoStep() {
    if (this.mode !== 'AUTO') return;

    if (this.estop || this.busy) {
      this.scheduleAutoStep(500);
      return;
    }

    if (this.count >= this.max) {
      if (this.autoDirection !== 'DRAIN') {
        log('AUTO', 'Maximum capacity reached. Automatic cycle changed to exit pulses.');
      }
      this.autoDirection = 'DRAIN';
    } else if (this.count <= 0) {
      if (this.autoDirection !== 'FILL') {
        log('AUTO', 'Parking lot empty. Automatic cycle changed to entry pulses.');
      }
      this.autoDirection = 'FILL';
    }

    const tag = this.autoDirection === 'FILL' ? 'Entry_Sensor' : 'Exit_Sensor';

    // Clear the opposite sensor and establish a clean low state before
    // producing exactly one rising edge for the next PLC scan.
    this.inputs.Entry_Sensor = false;
    this.inputs.Exit_Sensor = false;
    this.prev.Entry_Request = this.inputs.Entry_HMI;
    this.prev.Exit_Request = this.inputs.Exit_HMI;

    setTimeout(() => {
      if (this.mode !== 'AUTO' || this.estop || this.busy) {
        this.scheduleAutoStep(500);
        return;
      }

      this.inputs[tag] = true;
      log('AUTO', `${tag} generated automatically.`);

      setTimeout(() => {
        this.inputs[tag] = false;
      }, 220);
    }, 120);
  }

  pulseAction(action) {
    if (this.estop || this.busy) return;
    if (this.mode === 'AUTO' && action !== 'reset') {
      log('INFO', 'Entry and exit are generated automatically in AUTO mode. Switch to MANUAL for HMI control.');
      return;
    }

    const map = this.mode === 'AUTO'
      ? { reset: 'Reset_Count' }
      : { entry: 'Entry_HMI', exit: 'Exit_HMI', reset: 'Reset_HMI' };

    const tag = map[action];
    if (!tag) return;

    this.inputs[tag] = true;
    log('INPUT', `${tag} pulsed in ${this.mode} mode.`);
    setTimeout(() => {
      this.inputs[tag] = false;
    }, 240);
  }

  async handleEntry() {
    this.busy = true;
    log('ENTRY', `Entry request accepted from ${this.mode === 'AUTO' ? 'Entry_Sensor' : 'Entry_HMI'}. Opening entrance gate.`);
    await this.scene.enter();
    this.count = Math.min(this.max, this.count + 1);
    this.busy = false;
    log('COUNT', `Vehicle entered. Occupancy ${this.count}/${this.max}.`);
    this.scan();
    if (this.mode === 'AUTO') this.scheduleAutoStep(900);
  }

  async handleExit() {
    this.busy = true;
    log('EXIT', `Exit request accepted from ${this.mode === 'AUTO' ? 'Exit_Sensor' : 'Exit_HMI'}. Opening exit gate.`);
    await this.scene.exit();
    this.count = Math.max(0, this.count - 1);
    this.busy = false;
    log('COUNT', `Vehicle exited. Occupancy ${this.count}/${this.max}.`);
    this.scan();
    if (this.mode === 'AUTO') this.scheduleAutoStep(900);
  }

  scan() {
    this.scanCount += 1;

    const entryRequest = this.inputs.Entry_Sensor || this.inputs.Entry_HMI;
    const exitRequest = this.inputs.Exit_Sensor || this.inputs.Exit_HMI;
    const resetRequest = this.inputs.Reset_Count || this.inputs.Reset_HMI;

    const full = this.count >= this.max;
    const empty = this.count <= 0;
    const entryRise = entryRequest && !this.prev.Entry_Request;
    const exitRise = exitRequest && !this.prev.Exit_Request;
    const resetRise = resetRequest && !this.prev.Reset_Request;

    this.entryGate = entryRequest && !full && !this.estop;
    this.exitGate = exitRequest && !empty && !this.estop;

    if (resetRise && !this.estop && !this.busy) {
      this.count = 0;
      this.scene.reset();
      log('RESET', `Parking counter reset from ${this.mode === 'AUTO' ? 'Reset_Count' : 'Reset_HMI'}.`);
    }

    if (entryRise) {
      if (full) {
        log('BLOCKED', 'Entry rejected: lot full.', 'warning');
      } else if (!this.estop && !this.busy) {
        this.handleEntry();
      }
    }

    if (exitRise) {
      if (empty) {
        log('BLOCKED', 'Exit ignored: lot empty.', 'warning');
      } else if (!this.estop && !this.busy) {
        this.handleExit();
      }
    }

    this.prev = {
      Entry_Request: entryRequest,
      Exit_Request: exitRequest,
      Reset_Request: resetRequest
    };

    this.update();
  }

  toggleMode() {
    const nextMode = this.mode === 'AUTO' ? 'MANUAL' : 'AUTO';

    // Stop future automatic pulses immediately. Never reset Car_Count or
    // the 3D scene when changing modes.
    this.stopAutoCycle();
    this.inputs.Entry_Sensor = false;
    this.inputs.Exit_Sensor = false;
    this.inputs.Entry_HMI = false;
    this.inputs.Exit_HMI = false;

    this.mode = nextMode;
    this.prev.Entry_Request = false;
    this.prev.Exit_Request = false;

    if (this.mode === 'AUTO') {
      if (this.count >= this.max) this.autoDirection = 'DRAIN';
      else if (this.count <= 0) this.autoDirection = 'FILL';
      this.startAutoCycle(this.busy ? 500 : 900);
    }

    log(
      'MODE',
      this.mode === 'AUTO'
        ? 'Auto mode enabled. Sensor pulses will run one vehicle sequence at a time.'
        : 'Manual mode enabled. Entry and exit buttons now pulse Entry_HMI and Exit_HMI.'
    );
    this.scan();
  }

  toggleEstop() {
    this.estop = !this.estop;
    Object.keys(this.inputs).forEach((tag) => {
      this.inputs[tag] = false;
    });
    log(
      this.estop ? 'ALARM' : 'RESET',
      this.estop ? 'Emergency stop activated.' : 'Emergency stop released.',
      this.estop ? 'alarm' : ''
    );
    this.scan();
  }

  update() {
    const full = this.count >= this.max;
    const empty = this.count <= 0;
    const remaining = this.max - this.count;
    const entryRequest = this.inputs.Entry_Sensor || this.inputs.Entry_HMI;
    const exitRequest = this.inputs.Exit_Sensor || this.inputs.Exit_HMI;
    const set = (id, value) => {
      const element = $(id);
      if (element) element.textContent = value;
    };

    set('scan-count', this.scanCount.toLocaleString());
    set('count', this.count);
    set('remaining', `${remaining} ${remaining === 1 ? 'space' : 'spaces'} available`);
    set('mode', this.mode);
    set('entry-gate', this.entryGate ? 'OPEN' : 'CLOSED');
    set('exit-gate', this.exitGate ? 'OPEN' : 'CLOSED');
    set('full', bool(full));
    set('empty', bool(empty));

    $('mode').classList.toggle('manual', this.mode === 'MANUAL');
    set('entry-source', this.mode === 'AUTO' ? 'Automatic Entry_Sensor' : 'Pulse Entry_HMI');
    set('exit-source', this.mode === 'AUTO' ? 'Automatic Exit_Sensor' : 'Pulse Exit_HMI');
    set('mode-action', this.mode === 'AUTO' ? 'Switch to Manual' : 'Switch to Auto');

    $('meter-fill').style.width = `${(this.count / this.max) * 100}%`;
    $('meter-fill').style.background = full
      ? 'linear-gradient(90deg,#ffc75a,#ff526e)'
      : 'linear-gradient(90deg,#43f0a0,#43dcff)';

    set('lot-state', this.estop ? 'SYSTEM STOPPED' : full ? 'LOT FULL' : empty ? 'LOT EMPTY' : 'SPACES AVAILABLE');
    set(
      'state-text',
      this.estop
        ? 'Emergency stop active'
        : this.busy
          ? 'Vehicle sequence in progress'
          : full
            ? 'Capacity reached — entry blocked'
            : empty
              ? `Ready — lot empty (${this.mode} mode)`
              : `${remaining} spaces remain (${this.mode} mode)`
    );

    $('entry').disabled = this.mode === 'AUTO' || this.estop || this.busy || full;
    $('exit').disabled = this.mode === 'AUTO' || this.estop || this.busy || empty;
    $('reset').disabled = this.estop || this.busy;
    $('toggle-mode').disabled = false;
    $('estop').classList.toggle('active', this.estop);

    set('t-entry', bool(this.inputs.Entry_Sensor));
    set('t-exit', bool(this.inputs.Exit_Sensor));
    set('t-entry-hmi', bool(this.inputs.Entry_HMI));
    set('t-exit-hmi', bool(this.inputs.Exit_HMI));
    set('t-entry-gate', bool(this.entryGate));
    set('t-exit-gate', bool(this.exitGate));
    set('t-full', bool(full));
    set('t-empty', bool(empty));
    set('t-count', this.count);

    $('node-entry').querySelector('b').textContent = bool(entryRequest);
    $('node-exit').querySelector('b').textContent = bool(exitRequest);
    $('node-gate').querySelector('b').textContent = bool(this.entryGate);
    set('cu', entryRequest ? 1 : 0);
    set('cd', exitRequest ? 1 : 0);
    set('cv', this.count);
    set('qu', full ? 1 : 0);
    set('qd', empty ? 1 : 0);
    set('lad-count', this.count);

    [
      ['node-entry', entryRequest],
      ['wire-entry', entryRequest],
      ['node-exit', exitRequest],
      ['wire-exit', exitRequest],
      ['node-gate', this.entryGate],
      ['wire-gate', this.entryGate],
      ['lad-entry', entryRequest],
      ['lad-full', !full],
      ['lad-gate', this.entryGate],
      ['lad-exit', exitRequest],
      ['lad-exit-gate', this.exitGate]
    ].forEach(([id, on]) => {
      $(id).classList.toggle(id.includes('wire') ? 'wire-active' : 'active-signal', on);
    });
  }
}

const scene=new Parking3D($('scene'));const plc=new PLC(scene);
$('entry').onclick=()=>plc.pulseAction('entry');$('exit').onclick=()=>plc.pulseAction('exit');$('reset').onclick=()=>plc.pulseAction('reset');$('toggle-mode').onclick=()=>plc.toggleMode();$('estop').onclick=()=>plc.toggleEstop();$('clear-log').onclick=()=>{$('log').innerHTML='';log('SYSTEM','Event buffer cleared.')};
document.querySelectorAll('[data-camera]').forEach(b=>b.onclick=()=>scene.cameraView(b.dataset.camera));document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.remove('active'));document.querySelectorAll('.logic-view').forEach(x=>x.classList.remove('active'));b.classList.add('active');$(b.dataset.view).classList.add('active')});
log('SYSTEM','Virtual PLC initialized with a 100 ms scan cycle in MANUAL mode.');log('SYSTEM','Three.js parking digital twin online.');
