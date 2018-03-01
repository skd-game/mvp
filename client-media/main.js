var WIDTH;
var HEIGHT;

var VIEW_ANGLE;
var ASPECT;
var NEAR;
var FAR;

var container;

var renderer;
var camera;
var scene;

var controls;

var cube, cubeWireframe;
var floor, floorWireframe;
var jsonModel;

var JSONLoader;

init()
addMeshes()
enablePointerLock()
requestAnimationFrame(update);

function init(){
  WIDTH = window.innerWidth;
  HEIGHT = window.innerHeight;

  VIEW_ANGLE = 45;
  ASPECT = WIDTH / HEIGHT;
  NEAR = 0.1;
  FAR = 10000;

  container = document.getElementById("container");

  renderer = new THREE.WebGLRenderer();

  camera = new THREE.PerspectiveCamera(
    VIEW_ANGLE,
    ASPECT,
    NEAR,
    FAR
  );

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7ec0ee);

  controls = new THREE.PointerLockControls( camera );
  scene.add( controls.getObject() );
  controls.getObject().position.y = 2;

  renderer.setSize(WIDTH, HEIGHT);

  container.appendChild(renderer.domElement);
  
  loader = new THREE.JSONLoader();

}

function addMeshes(){

  cube = new THREE.Mesh(
    new THREE.BoxGeometry(3,3,3),
    new THREE.MeshBasicMaterial({color:0x6f9fed, polygonOffset: true,
    polygonOffsetFactor: 1, // positive value pushes polygon further away
    polygonOffsetUnits: 1})
  );
  
  cubeWireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(cube.geometry),
    new THREE.LineBasicMaterial({color:0x000000, linewidth: 2})
  );
  
  cube.position.z = -10;
  cubeWireframe.position.z = -10;
  
  floor = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100, 50, 50),
    new THREE.MeshBasicMaterial( {color: 0x999999} )
  );
  
  floorWireframe = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100, 10, 10),
    new THREE.MeshBasicMaterial( {color: 0x000000, wireframe:true})
  );
  
  floor.rotation.x = -Math.PI/2;
  floorWireframe.rotation.x = -Math.PI/2;
  floorWireframe.position.y = 0.05;
  
   
  /*loader.load( './Sphere.blend.json', function(geometry){
    
    jsonModel = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({color:0xff0000, wireframe:true}));
    
    jsonModel.position.z = -20;
    jsonModel.scale.set(0.2, 0.2, 0.2);
  
    scene.add(jsonModel);

  });*///loads model
  
  scene.add(cube, cubeWireframe, floor, floorWireframe);
}

function enablePointerLock(){
    var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

  if(havePointerLock){

    var element = document.body;

    controls.enabled = true;

    var pointerlockchange = function ( event ) {

    };

    var pointerlockerror = function ( event ) {

      alert("error");

    };

    // Hook pointer lock state change events
    document.addEventListener( 'pointerlockchange', pointerlockchange, false );
    document.addEventListener( 'mozpointerlockchange', pointerlockchange, false );
    document.addEventListener( 'webkitpointerlockchange', pointerlockchange, false );

    document.addEventListener( 'pointerlockerror', pointerlockerror, false );
    document.addEventListener( 'mozpointerlockerror', pointerlockerror, false );
    document.addEventListener( 'webkitpointerlockerror', pointerlockerror, false );

    document.addEventListener( 'click', function ( event ) {

      // Ask the browser to lock the pointer
      element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
      element.requestPointerLock();

    }, false );

  } else {

    alert("browser doesn\'t support PointerLock API");

  }
}

var inAir = false;
const camHeight = 2.0;
var camVel = {x:0.0, y:0.0, z:0.0};

const gravity = 0.04;

//IDEA: to fix "jitter" problem while on a surface (raytracer moves player up to surface but 
//gravity is pulling player down in same loop, causing a "jitter" effect), have a timer which only
//lets gravity act after player has been off a surface for a certain time
//EDIT: "jittering" solved with gravityTimeout!

const gravityTimeout = 0.05;//seconds
var lastTimeOnGround = Date.now()/1000;//seconds


function update(){
  
  //hovering and rotating cube
  
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  cubeWireframe.rotation.x = cube.rotation.x;
  cubeWireframe.rotation.y = cube.rotation.y;
  
  cube.position.y = 5 + Math.sin(Date.now()*2*Math.PI/4000);//cubs moves every 4 seconds
  cubeWireframe.position.y = cube.position.y;
  
  //camera horizontal movements
  
  var z = -((keyboardState.w || keyboardState.up) - (keyboardState.s || keyboardState.do));
  var x = (keyboardState.d || keyboardState.ri) - (keyboardState.a || keyboardState.le);
  
  var pLocal = new THREE.Vector3(x, 0, z); //in front of camera				
  var pWorld = pLocal.applyMatrix4(controls.getObject().matrixWorld);
  
  var dir = pWorld.sub(controls.getObject().position).normalize();
  var corrected = new THREE.Vector3(dir.x, 0, dir.z);
  
  corrected = corrected.normalize();
  
  camVel.x = corrected.x/2;
  camVel.z = corrected.z/2;

  controls.getObject().position.x += camVel.x;
  controls.getObject().position.z += camVel.z;

  //raytracing and jumping
  
  var ray = new THREE.Raycaster(controls.getObject().position, new THREE.Vector3(0, -1, 0), 0, camHeight);
					
  var intersects = ray.intersectObjects(scene.children, true);//TODO:: this might be very computationally expensive if there are lots of meshes or meshes with lots of triangles.
  
  if(intersects.length == 0){
    
    inAir = true;
    controls.getObject().position.y += camVel.y;
    
  }else{
    inAir = false;
    
    controls.getObject().position.y = intersects[0].point.y + camHeight;
  }
  
  if(controls.getObject().position.y < -10){ //reset position and y velocity if player falls of map
    
    controls.getObject().position.set(0,10,0);
    camVel.y = 0.0;
    
  }
  
  //only permit to jump if not inAir
  
  if(!inAir){//if on a surface
    
    lastTimeOnGround = Date.now()/1000;//reset last time on ground
    
    camVel.y = keyboardState.space;
    
    if(keyboardState.space == 1){//if jumped on surface
      
      controls.getObject().position.y += 0.0001;//increment height so raytracer doesn't detect it is  on a surface
      
    }
    
  }else{//fall by gravity if not on a surface (after a gravity timeout)
    
    if(Date.now()/1000 - lastTimeOnGround > gravityTimeout){//seconds
    
      camVel.y -= gravity;
    
    }
    
  }
  
  
  renderer.render(scene, camera);
  
  requestAnimationFrame(update);
}