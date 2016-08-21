
/*

TODO list:
	
	World object
		- Should be rendered in Chunks of appropriate size, such that reloading attr arrays is manageable
		
	Camera object
		- should create modelView and projection matrices based on certain conditions
	
	FramebufferManager object
		- Should manage a framebuffer and associated render buffers
		- Either default or off-screen framebuffer
		- .bind and .unbind methods activation and deactivation
	
	Textures? Bump mapping and shit? Sounds cool
	
*/


"use strict"

var gl;

// shader attribute data
var points = [];
var colors = [];

// shader programs
var shaderProgram; // main shader program

// world settings
var worldSizeX = 50;
var worldSizeY = 50;
var worldSizeZ = 50;

// settings
var fullscreen = false;
var canvasDefaultHeight = 600;
var canvasDefaultWidth= 800;

// uniform pointers
var modelViewLoc;
var projectionLoc;
var eyePositionLoc;

// camera related variables
var Camera;
var FrustumCamera;

// controls
var Controls; // object with control functions
var mouseSensitivityX = 0.1;
var mouseSensitivityY = 0.1;
var noclip = false;

// html elements
var canvas;
var fullscreenButton;
var noclipButton;
var renderModeButton;
var frustumButton;
var statsElement;

// time manager
var Time;
var then = 0;
var now = 0;
var fps = 0;
var fpsCounter = 0;

// World management and chunk loading
var World;
var MAX_CHUNKS_PER_FRAME = 1; // the maximum number of chunks to load per frame
const CHUNK_SIZE = 16; // number of blocks in each chunk

var CHUNK_LOAD_RADIUS = 9; // Square of the distance at which new chunks should load
var CHUNK_UNLOAD_RADIUS = 64; // Square of the distance at which chunks should unload

window.onload = function(e){
	
	//Get HTML elements
	canvas = document.getElementById( "gl-canvas" );
	fullscreenButton = document.getElementById( "fullscreen-button" );
	noclipButton = document.getElementById( "toggle-noclip-button" );
	renderModeButton = document.getElementById( "toggle-render-mode-button" );
	frustumButton = document.getElementById( "lock-frustum-button" );
	statsElement = document.getElementById( "stats" );
	
	
	// Set the canvas width to fill the window
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	
	// Initial camera settings 
	var initial_eye = [CHUNK_SIZE-1, 0, CHUNK_SIZE-1];
	var initial_at 	= [CHUNK_SIZE-1, 0, CHUNK_SIZE-2];
	var initial_up	= [0, 1, 0];
	var initial_fovy 	= 70;
	var initial_near 	= 0.01;
	var initial_far 	= 150;
	var initial_aspect = canvas.width/canvas.height;
	
	var frustum_eye = [CHUNK_SIZE-1, 0, CHUNK_SIZE-1];
	var frustum_at 	= [CHUNK_SIZE-1, 0, CHUNK_SIZE-2];
	var frustum_up	= [0, 1, 0];
	var frustum_fovy 	= initial_fovy;
	var frustum_near 	= initial_near;
	var frustum_far 	= initial_far;
	var frustum_aspect = canvas.width/canvas.height;
	
	// Initialize camera and control objects
	Camera = new Frustum(initial_eye, initial_at, initial_up, initial_fovy, initial_near, initial_far, initial_aspect);
	FrustumCamera = new Frustum(frustum_eye, frustum_at, frustum_up, frustum_fovy, frustum_near, frustum_far, frustum_aspect);
	FrustumCamera.Update();
	Controls = new NormalControls(Camera);
	Time = new TimeManager();
	
	// Create WebGL context
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
	
	// set up the viewport
	gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.7, 0.9, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor( 0.7, 0.9, 1.0, 1.0 ); // Background color, a nice soft blue (sky)
	
	// load fragment and vertex shaders
	loadFiles(['shaders/vSimplePhong.shader', 'shaders/fSimplePhong.shader'],
		function (shaderSources){
			self.shaderProgram = loadShaders (shaderSources);
		},
		function (url) {
			alert('Failed to download "' + url + '"');
		}
	);
	
	// import shader for drawing the frustum outline
	var shaderPass;
	loadFiles(['shaders/vPass.shader', 'shaders/fPass.shader'],
		function (shaderSources){
			self.shaderPass = loadShaders (shaderSources);
		},
		function (url) {
			alert('Failed to download "' + url + '"');
		}
	);
	
	// Load the chunk manager (world manager)
	World = new WorldManager(gl, shaderProgram, Camera);
	
	// Create pointers to uniform variables in vertex shader
	modelViewLoc = gl.getUniformLocation(shaderProgram, "modelView");
	projectionLoc = gl.getUniformLocation(shaderProgram, "projection");
	eyePositionLoc = gl.getUniformLocation(shaderProgram, "eyePosition");
	
	// Bind event listener callbacks
	bindCallbacks();
	
	// Initiate render loop
	render();
}


function render() {
	
	//console.log(Camera.eye);
	//console.log(FrustumCamera.eye);
	//console.log("----------------");
	
	// clear the colour and depth render buffers
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	// Manage time
	Time.advance(); // update dt since last frame (in miliseconds)
	Time.updateFPS(); // track the FPS
	statsElement.innerHTML = "";
	statsElement.innerHTML += Time.fps + " fps";
	statsElement.innerHTML += "<br/>("+Camera.eye+")";
	statsElement.innerHTML += "<br/>"+World.numChunks+" chunks loaded";
	
	// Move the player
	Controls.move(Time.dt);
	Camera.Update();
	
	// Update the frustum cam if it is not locked - if it is locked, draw it
	if (World.frustumCam == Camera){
		FrustumCamera.eye = [Camera.eye[0], Camera.eye[1], Camera.eye[2]];
		FrustumCamera.up  = [Camera.up[0],  Camera.up[1],  Camera.up[2]];
		FrustumCamera.at  = [Camera.at[0],  Camera.at[1],  Camera.at[2]];
		FrustumCamera.Update();
	} else {
		FrustumCamera.RenderCamera(gl, shaderPass);
	}
	
	// Transfer modelView and projection
	gl.useProgram(shaderProgram);
	gl.uniformMatrix4fv(modelViewLoc, false, flatten(Camera.modelView));
	gl.uniformMatrix4fv(projectionLoc, false, flatten(Camera.projection));
	gl.uniform3f(eyePositionLoc, Camera.eye[0], Camera.eye[1], Camera.eye[2]);
	
	// FIRE! (updates the internal world state and renders everything in the render list)
	World.Update();
	//World.Render(shaderProgram, World.renderMode);
	
	// continue render loop
    requestAnimFrame( render );
	
}




