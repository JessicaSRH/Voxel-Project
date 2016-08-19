
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
var fpsElement;

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

var CHUNK_LOAD_RADIUS = 16; // Square of the distance at which new chunks should load
var CHUNK_UNLOAD_RADIUS = 64; // Square of the distance at which chunks should unload

window.onload = function(e){
	
	//Get HTML elements
	canvas = document.getElementById( "gl-canvas" );
	fullscreenButton = document.getElementById( "fullscreen-button" );
	noclipButton = document.getElementById( "toggle-noclip-button" );
	renderModeButton = document.getElementById( "toggle-render-mode-button" );
	fpsElement = document.getElementById( "fps" );
	
	// Initialize control objects
	Controls = new NormalControls(vec3(0,0,0), vec3(0,0,1), vec3(0,1,0));
	Time = new TimeManager();
	
	// Should be in a camera object - I will create this later
	Controls.aspect = canvas.width/canvas.height;
	
	// Create WebGL context
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
	
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
	
	// Load the chunk manager (world manager)
	World = new WorldManager(gl, shaderProgram);
	
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
	
	// Manage time
	Time.advance(); // update dt since last frame (in miliseconds)
	Time.updateFPS(); // track the FPS
	fpsElement.innerHTML = "Framerate: " + Time.fps;
	
	// Move the player
	Controls.move(Time.dt);
	
	// clear the colour and depth render buffers
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	// Transfer modelView and projection
	gl.useProgram(shaderProgram);
	gl.uniformMatrix4fv(modelViewLoc, false, flatten(Controls.modelView));
	gl.uniformMatrix4fv(projectionLoc, false, flatten(Controls.projection));
	gl.uniform3f(eyePositionLoc, Controls.eye[0], Controls.eye[1], Controls.eye[2]);
	
	// FIRE! (updates the internal world state and renders everything in the render list)
	World.Update();
	World.Render(shaderProgram, World.renderMode);
	
	// continue render loop
    requestAnimFrame( render );
	
}




