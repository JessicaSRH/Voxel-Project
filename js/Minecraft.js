"use strict"

var gl;

// shader attribute data
var points = [];
var colors = [];

// shader programs
var program; // main shader program
var passProgram; // pass through

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

window.onload = function(e){
	
	//Get HTML elements
	canvas = document.getElementById( "gl-canvas" );
	fullscreenButton = document.getElementById( "fullscreen-button" );
	noclipButton = document.getElementById( "toggle-noclip-button" );
	
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

	aspect = canvas.width/canvas.height;

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
	
	colorCube();
	
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
	
	canvas.onmousemove = function (event){
		if(document.pointerLockElement === canvas ||
           document.mozPointerLockElement === canvas ||
           document.webkitPointerLockElement === canvas)
        {
			Controls.lookLeftRight(-mouseSensitivityX*event.movementX);
			//console.log(Controls);
			Controls.lookUpDown(-mouseSensitivityY*event.movementY);
		}
	}
	
	canvas.onmousedown = function (event) {
		// pointer is locked
		if (document.pointerLockElement === canvas ||
		document.mozPointerLockElement === canvas ||
		document.webkitPointerLockElement === canvas)
		{
			
		} else {
			// We need to lock the pointer
			canvas.requestPointerLock =
			canvas.requestPointerLock ||
			canvas.mozRequestPointerLock ||
			canvas.webkitRequestPointerLock;
			canvas.requestPointerLock();
		}
	}
	
	window.onkeydown = function(event) {
		var	key	=	String.fromCharCode(event.keyCode );
		switch(key) {
			case 'A':
				Controls.moveLeftBool = true;
				break;
			case 'D':
				Controls.moveRightBool = true;
				break;
			case 'W':
				Controls.moveForwardBool = true;
				break;
			case 'S':
				Controls.moveBackwardBool = true;
				break;
            case ' ': //space key
				if (event.keyCode == 32 && event.target == document.body) {
					event.preventDefault();
				}
                Controls.moveUpBool = true;
                break;
		}
    }
	
	window.onkeyup = function(event) {
		var	key	=	String.fromCharCode(event.keyCode );
		switch(key) {
			case 'A':
				Controls.moveLeftBool = false;
				break;
			case 'D':
				Controls.moveRightBool = false;
				break;
			case 'W':
				Controls.moveForwardBool = false;
				break;
			case 'S':
				Controls.moveBackwardBool = false;
				break;
            case ' ': //space key
                Controls.moveUpBool = false;
                break;
		}
    }
	
	// fullscreen toggle
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
	
	// noclip toggle
	noclipButton.onclick = function (event){
		if(noclip){
			Controls = new NormalControls(Controls.eye, Controls.at, Controls.up);
		} else {
			Controls = new NoclipControls(Controls.eye, Controls.at, Controls.up);
		}
		noclip = !noclip;
	}
	
	// event listener for fullscreen toggle
	function fullscreenCallback (event){
		fullscreen = !fullscreen;
	}
	document.onmozfullscreenchange = fullscreenCallback;
	document.onwebkitfullscreenchange = fullscreenCallback;
	document.fullscreenchange = fullscreenCallback;
	
	render();
}



// control objects
function NormalControls (init_eye, init_at, init_up) {
	
	var eye = init_eye;
	var at = init_at;
	var up = init_up;
	var moveLeftBool = false;		// should be changed by keydown even listener
	var moveRightBool = false;		// should be changed by keydown even listener
	var moveUpBool = false;			// should be changed by keydown even listener
	var moveDownBool = false;		// should be changed by keydown even listener
	var moveForwardBool = false;	// should be changed by keydown even listener
	var moveBackwardBool = false;	// should be changed by keydown even listener
	var spd = 0.01;
	
	return {
		
		eye: eye,
		at:  at,
		up:  up,
		moveLeftBool: moveLeftBool,
		moveRightBool: moveRightBool,
		moveUpBool: moveUpBool,
		moveDownBool: moveDownBool,
		moveForwardBool: moveForwardBool,
		moveBackwardBool: moveBackwardBool,
		
		// only this function should be called for movement
		move: function(){
			if(this.moveLeftBool){ this.moveLeftRight(); }
			if(this.moveRightBool){ this.moveLeftRight(true); }
			if(this.moveUpBool){ console.log("3"); }
			if(this.moveDownBool){ console.log("4"); }
			if(this.moveForwardBool){ this.moveForwardBackward(); }
			if(this.moveBackwardBool){ this.moveForwardBackward(true); }
		},
		
		moveForwardBackward: function(backwardsBool){
			var dir;
			
			if (backwardsBool){
				dir = normalize(subtract(this.eye,this.at));
			} else {
				dir = normalize(subtract(this.at,this.eye));
			}
			this.update(dir);
		},
		
		moveUpDown: function(downBoolean){
			
		},
		
		moveLeftRight: function(rightBool){
			var dir;
			
			if (rightBool){
				dir = normalize(cross(subtract(this.at,this.eye), this.up));
			} else {
				dir = normalize(cross(subtract(this.eye,this.at), this.up));
			}
			this.update(dir);
		},
		
		lookLeftRight: function (theta){
			var r = vec3(0,1,0);
			var rotMat = rotateAxis(theta, r);
			this.at = subtract(this.at,this.eye);
			this.at = mult(rotMat, vec4(this.at[0], this.at[1], this.at[2], 1));
			this.at.pop();
			this.at = add(this.at,this.eye);

			this.up = mult(rotMat, vec4(this.up[0],this.up[1],this.up[2],0));
			this.up.pop();
		},

		lookUpDown: function (theta){
			var r = normalize(cross(subtract(this.at,this.eye),this.up));
			var rotMat = rotateAxis(theta, r);
			var tempAt = this.at;
			var tempUp = this.up;
			tempAt = subtract(tempAt,this.eye);
			tempAt = mult(rotMat, vec4(tempAt[0], tempAt[1], tempAt[2], 1));
			tempAt.pop();
			tempAt = add(tempAt,this.eye);

			tempUp = mult(rotMat, vec4(tempUp[0],tempUp[1],tempUp[2],0));
			tempUp.pop();

			if(tempUp[1] > 0.00000001){ // slightly more than 0 to avoid rounding errors at the boundary
				this.up = tempUp;
				this.at = tempAt;
			}
		},
		
		update: function (dir){
			dir[1] = 0; // lock the y-direction; don't lock it for no-clip
			dir = normalize(dir);
			this.eye[0] += dir[0]*spd;
			this.eye[1] += dir[1]*spd;
			this.eye[2] += dir[2]*spd;
			this.at[0] += dir[0]*spd;
			this.at[1] += dir[1]*spd;
			this.at[2] += dir[2]*spd;
		}
	}
}

function NoclipControls (init_eye, init_at, init_up) {
	
	var normalControls = new NormalControls(init_eye, init_at, init_up);
	
	var eye = init_eye;
	var at = init_at;
	var up = init_up;
	var moveLeftBool = false;		// should be changed by keydown even listener
	var moveRightBool = false;		// should be changed by keydown even listener
	var moveUpBool = false;			// should be changed by keydown even listener
	var moveDownBool = false;		// should be changed by keydown even listener
	var moveForwardBool = false;	// should be changed by keydown even listener
	var moveBackwardBool = false;	// should be changed by keydown even listener
	var spd = 0.01;
	
	return {
		
		eye: eye,
		at:  at,
		up:  up,
		moveLeftBool: moveLeftBool,
		moveRightBool: moveRightBool,
		moveUpBool: moveUpBool,
		moveDownBool: moveDownBool,
		moveForwardBool: moveForwardBool,
		moveBackwardBool: moveBackwardBool,
		normalControls: normalControls,
		
		move: function(){
			this.normalControls.eye = this.eye;
			this.normalControls.at = this.at;
			this.normalControls.up = this.up;
			this.normalControls.moveLeftBool = this.moveLeftBool;
			this.normalControls.moveRightBool = this.moveRightBool;
			this.normalControls.moveUpBool = this.moveUpBool;
			this.normalControls.moveDownBool = this.moveDownBool;
			this.normalControls.moveForwardBool = this.moveForwardBool;
			this.normalControls.moveBackwardBool = this.moveBackwardBool;
			
			this.normalControls.update = this.update;
			this.normalControls.move();
			
			this.eye = normalControls.eye;
			this.at = normalControls.at;
			this.up = normalControls.up;
		},
		moveForwardBackward: function(moveBackwardBool){
			
		},
		moveUpDown: function(moveDownBool){
			
		},
		moveLeftRight: function(moveRightBool){
			
		},
		lookLeftRight: function(theta){
			this.normalControls.lookLeftRight(theta);
			this.eye = normalControls.eye;
			this.at = normalControls.at;
			this.up = normalControls.up;
		},
		lookUpDown: function(theta){
			this.normalControls.lookUpDown(theta);
			this.eye = normalControls.eye;
			this.at = normalControls.at;
			this.up = normalControls.up;
		},
		update: function(dir){
			dir = normalize(dir);
			this.eye[0] += dir[0]*spd;
			this.eye[1] += dir[1]*spd;
			this.eye[2] += dir[2]*spd;
			this.at[0] += dir[0]*spd;
			this.at[1] += dir[1]*spd;
			this.at[2] += dir[2]*spd;
		}
		
	}
}

function rotateAxis(theta, u){
	
	u = normalize(u, u.length == 4);
	
	var d = Math.sqrt(Math.pow(u[1],2) + Math.pow(u[2],2));
	var Rx = mat4(
		1,0,0,0,
		0,u[2]/d,-u[1]/d,0,
		0,u[1]/d,u[2]/d,0,
		0,0,0,1
	);
	
	var Ry = mat4(
		d,0,-u[0],0,
		0,1,0,0,
		u[0],0,d,0,
		0,0,0,1
	);
	
	var Rx_inv = inverse4(Rx);
	var Ry_inv = inverse4(Ry);
	
	theta = radians(theta);
	var Rz = mat4(
		Math.cos(theta), -Math.sin(theta), 0, 0,
		Math.sin(theta), Math.cos(theta), 0, 0,
		0,0,1,0,
		0,0,0,1
	);
	
	return mult(Rx_inv, mult(Ry_inv, mult(Rz, mult(Ry, Rx ))));
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
	
	
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	// Set up the modelview and projection matrices
	var modelView = lookAt(Controls.eye,Controls.at,Controls.up);
	var fovy = 70;
	var near = 0.1;
	var far = 5;
	var projection = perspective( fovy, aspect, near, far )
	
	Controls.move();
	
	// Transfer modelView and projection
	gl.uniformMatrix4fv(modelViewLoc, false, flatten(modelView));
	gl.uniformMatrix4fv(projectionLoc, false, flatten(projection));
	
	// FIRE!
	gl.drawArrays( gl.TRIANGLES, 0, points.length );
	
	// continue render loop
    requestAnimFrame( render );
	
}



