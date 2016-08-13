
/*

TODO list:
	World object
		- [NOPE] should support easy addition and removal of points without reloading attribute arrays
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
var program; // main shader program
var passProgram; // pass through

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

// camera related variables
var aspect;
var fovy = 70;
var near = 0.01;
var far = 200;

// controls
var Controls; // object with control functions
var mouseSensitivityX = 0.1;
var mouseSensitivityY = 0.1;
var noclip = false;

// html elements
var canvas;
var fullscreenButton;
var noclipButton;
var fpsCounter;

// time manager
var Time;

// World management
var World;
var chunk;

window.onload = function(e){
	
	//Get HTML elements
	canvas = document.getElementById( "gl-canvas" );
	fullscreenButton = document.getElementById( "fullscreen-button" );
	noclipButton = document.getElementById( "toggle-noclip-button" );
	fpsCounter = document.getElementById( "fps" );
	
	// Should be in a camera object - I will create this later
	aspect = canvas.width/canvas.height;
	
	// Get WebGL context
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
	
	gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.7, 0.9, 1.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.clearColor( 0.7, 0.9, 1.0, 1.0 ); // Background color, a nice soft blue (sky)
	
	// load fragment and vertex shaders
	loadFiles(['shaders/vPass.shader', 'shaders/fPass.shader'],
		function (shaderSources){
			self.passProgram = loadShaders (shaderSources);
		},
		function (url) {
			alert('Failed to download "' + url + '"');
		}
	);
	
	// World generation
	World = new WorldManager(gl);
	chunk = new World.Chunk(vec4(0,0,0,0));
	chunk.CreateMesh(passProgram);
	
	// Create pointers to uniform variables in vertex shader
	modelViewLoc = gl.getUniformLocation(passProgram, "modelView");
	projectionLoc = gl.getUniformLocation(passProgram, "projection");
	
	// Initialize control object
	Controls = new NormalControls(vec3(0,20,-2), vec3(0,20,-1), vec3(0,1,0));
	Time = new TimeManager();
	
	// Bind control callbacks
	bindCallbacks();
	
	// Initiate render loop
	render();
}


function render() {
	
	Time.advance(); //update dt since last frame (in miliseconds)
	Controls.move(Time.dt); // move the player
	if(Date.now() % 2 == 0) fps.innerHTML = "Framerate: " + Math.floor(10000/Time.dt)/10;
	
	// Set up the modelview and projection matrices
	var modelView = lookAt(Controls.eye,Controls.at,Controls.up);
	var projection = perspective( fovy, aspect, near, far )
	
	// clear the color and depth renderbuffers
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	// Transfer modelView and projection
	gl.uniformMatrix4fv(modelViewLoc, false, flatten(modelView));
	gl.uniformMatrix4fv(projectionLoc, false, flatten(projection));
	
	// FIRE!
	// Loop over each chunk
	chunk.Render();
	
	// continue render loop
    requestAnimFrame( render );
	
}



