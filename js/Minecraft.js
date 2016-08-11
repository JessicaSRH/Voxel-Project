
/*

TODO list:
	World object
		- should support easy addition and removal of points without reloading attribute arrays
	
	Camera object
		- should create modelView and projection matrices based on certain conditions
	
	Shader program manager object
		- Loads shaders
		- Should hold all relevant attribute buffers and uniform pointers (and values)
		- .bind method reactivates this context
	
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
var fovy = 70;
var near = 0.01;
var far = Math.max(Math.max(worldSizeX,worldSizeY),worldSizeZ)*2;

// uniform pointers
var modelViewLoc;
var projectionLoc;

// camera related variables
var aspect;
var fovy = 70;
var near = 0.1;
var far = 5;

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

window.onload = function(e){
	
	//Get HTML elements
	canvas = document.getElementById( "gl-canvas" );
	fullscreenButton = document.getElementById( "fullscreen-button" );
	noclipButton = document.getElementById( "toggle-noclip-button" );
	fpsCounter = document.getElementById( "fps" );
	
	// Should be in a camera object - I will create this later
	aspect = canvas.width/canvas.height;
	
	
	// World generation
	colorCube();
	
	
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
	
	gl.useProgram( passProgram );
	
    // Create and configure the vertex buffer
    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );
	
    var vPosition = gl.getAttribLocation( passProgram, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
	
	
	// Create and configure the color buffer
	var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
	
    var vColor = gl.getAttribLocation( passProgram, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
	
	
	
	// Create pointers to uniform variables in vertex shader
	modelViewLoc = gl.getUniformLocation(passProgram, "modelView");
	projectionLoc = gl.getUniformLocation(passProgram, "projection");
	
	// Initialize control object
	Controls = new NormalControls(vec3(0,0,-2), vec3(0,0,-1), vec3(0,1,0));
	Time = new TimeManager();
	
	// Bind control callbacks
	bindCallbacks();
	
	// Initiate render loop
	render();
}

// this is my solution right now - here all the interactive event callbacks are set
function bindCallbacks(){

	canvas.onmousemove = Controls.mousemoveCallback;
	canvas.onmousedown = Controls.mousedownCallback;
	window.onkeydown = Controls.keydownCallback;
	window.onkeyup = Controls.keyupCallback;
	
	noclipButton.onclick = function (event){
		if(noclip){
			Controls = new NormalControls(Controls.eye, Controls.at, Controls.up);
		} else {
			Controls = new NoclipControls(Controls.eye, Controls.at, Controls.up);
		}
		noclip = !noclip;
	}
	
	fullscreenButton.onclick = function (event){
		if (!fullscreen){
			if(canvas.requestFullScreen) {
				canvas.requestFullScreen();
			} else if (canvas.webkitRequestFullScreen) {
				canvas.webkitRequestFullScreen();
			} else if (canvas.mozRequestFullScreen) {
				canvas.mozRequestFullScreen();
			}
		}
	}
	
	
	function fullscreenCallback (event){
		fullscreen = !fullscreen;
	}
	document.onmozfullscreenchange = fullscreenCallback;
	document.onwebkitfullscreenchange = fullscreenCallback;
	document.fullscreenchange = fullscreenCallback;
	
}

function colorCube()
{
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}

function quad(a, b, c, d)
{
    var vertices = [
        vec4( -0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5,  0.5,  0.5, 1.0 ),
        vec4(  0.5, -0.5,  0.5, 1.0 ),
        vec4( -0.5, -0.5, -0.5, 1.0 ),
        vec4( -0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5,  0.5, -0.5, 1.0 ),
        vec4(  0.5, -0.5, -0.5, 1.0 )
    ];

    var vertexColors = [
        [ 0.0, 0.0, 0.0, 1.0 ],  // black
        [ 1.0, 0.0, 0.0, 1.0 ],  // red
        [ 1.0, 1.0, 0.0, 1.0 ],  // yellow
        [ 0.0, 1.0, 0.0, 1.0 ],  // green
        [ 0.0, 0.0, 1.0, 1.0 ],  // blue
        [ 1.0, 0.0, 1.0, 1.0 ],  // magenta
        [ 0.0, 1.0, 1.0, 1.0 ],  // cyan
        [ 1.0, 1.0, 1.0, 1.0 ]   // white
    ];
	
    // We need to parition the quad into two triangles in order for
    // WebGL to be able to render it.  In this case, we create two
    // triangles from the quad indices
	
    //vertex color assigned by the index of the vertex
	
    var indices = [ a, b, c, a, c, d ];
	
    for ( var i = 0; i < indices.length; ++i ) {
		points.push( vertices[indices[i]] );
        colors.push( vertexColors[a]);
	}
}



function render() {
	
	
	Time.advance(); //update dt since last frame (in miliseconds)
	Controls.move(Time.dt); // move the player
	//if(Date.now() % 2 == 0) fps.innerHTML = "Framerate: " + Math.floor(10000/Time.dt)/10;
	
	// Set up the modelview and projection matrices
	var modelView = lookAt(Controls.eye,Controls.at,Controls.up);
	var projection = perspective( fovy, aspect, near, far )
	
	// clear the color and depth renderbuffers
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	// Transfer modelView and projection
	gl.uniformMatrix4fv(modelViewLoc, false, flatten(modelView));
	gl.uniformMatrix4fv(projectionLoc, false, flatten(projection));
	
	// FIRE!
	gl.drawArrays( gl.TRIANGLES, 0, points.length );
	
	// continue render loop
    requestAnimFrame( render );
	
}



