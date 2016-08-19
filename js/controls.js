"use strict"


// normal control object
function NormalControls (init_eye, init_at, init_up) {
	
	// camera position
	var eye = init_eye;
	var at = init_at;
	var up = init_up;
	
	// perspective settings
	var aspect;
	var fovy = 70;
	var near = 0.01;
	var far = 200;
	
	var modelView = mat4();
	var projection = mat4();
	
	var moveLeftBool = false;		// should be changed by keydown even listener
	var moveRightBool = false;		// should be changed by keydown even listener
	var moveUpBool = false;			// should be changed by keydown even listener
	var moveDownBool = false;		// should be changed by keydown even listener
	var moveForwardBool = false;	// should be changed by keydown even listener
	var moveBackwardBool = false;	// should be changed by keydown even listener
	var spd = 0.005; // distance per milisecond
	var dt; // time in miliseconds - passed at every frame (dt since last frame)
	var dir = vec3(0,0,0);
	
	// only this function should be called for movement
	function move (dt){
		this.dir = vec3(0,0,0);
		this.dt = dt;
		if(this.moveForwardBool){ this.moveForwardBackward(); }
		if(this.moveBackwardBool){ this.moveForwardBackward(true); }
		if(this.moveLeftBool){ this.moveLeftRight(); }
		if(this.moveRightBool){ this.moveLeftRight(true); }
		if(this.moveUpBool){ console.log("3"); }
		if(this.moveDownBool){ console.log("4"); }
		if (dot(this.dir,this.dir) != 0) this.update();
		
		// Set up the modelView and projection matrices
		this.modelView = lookAt(this.eye,this.at,this.up);
		this.projection = perspective( this.fovy, this.aspect, this.near, this.far )
		
	}
	
	function moveForwardBackward(backwardsBool){
		var tempDirection;
			
		if (backwardsBool) 	tempDirection = subtract(this.eye,this.at);
		else 				tempDirection = subtract(this.at,this.eye);
		
		tempDirection[1] = 0; // lock y-movement
		
		this.dir = add(this.dir,normalize(tempDirection));
	}
	
	function moveUpDown(downBoolean){
		
	}
	
	function moveLeftRight(rightBool){
		if (rightBool) 	this.dir = add(this.dir,normalize(cross(subtract(this.at,this.eye), this.up)));
		else 			this.dir = add(this.dir,normalize(cross(subtract(this.eye,this.at), this.up)));
	}
	
	function lookLeftRight(theta){
		var r = vec3(0,1,0);
		var rotMat = rotateAxis(theta, r);
		this.at = subtract(this.at,this.eye);
		this.at = mult(rotMat, vec4(this.at[0], this.at[1], this.at[2], 1));
		this.at.pop();
		this.at = add(this.at,this.eye);

		this.up = mult(rotMat, vec4(this.up[0],this.up[1],this.up[2],0));
		this.up.pop();
	}

	function lookUpDown(theta){
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
	}
	
	function update(){
		this.dir = normalize(this.dir);
		this.eye[0] += this.dir[0]*spd*this.dt;
		this.eye[1] += this.dir[1]*spd*this.dt;
		this.eye[2] += this.dir[2]*spd*this.dt;
		this.at[0] += this.dir[0]*spd*this.dt;
		this.at[1] += this.dir[1]*spd*this.dt;
		this.at[2] += this.dir[2]*spd*this.dt;
	}
	
	function keydownCallback(event) {
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
			case 'C':
				Controls.moveDownBool = true;
				break;
			case ' ': //space key
				if (event.keyCode == 32 && event.target == document.body) {
					event.preventDefault();
				}
				Controls.moveUpBool = true;
				break;
		}
	}
	
	function keyupCallback(event) {
		var	key	=	String.fromCharCode(event.keyCode );
		switch(key) {
			case 'A':
				Controls.moveLeftBool = false;
				break;
			case 'D':
				Controls.moveRightBool = false;
				break;
			case 'W':
				if(event.ctrlKey) event.preventDefault();
				Controls.moveForwardBool = false;
				break;
			case 'S':
				Controls.moveBackwardBool = false;
				break;
			case 'C':
				Controls.moveDownBool = false;
				break;
			case ' ': //space key
				Controls.moveUpBool = false;
				break;
		}
	}
	
	function mousedownCallback(event) {
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
	
	function mousemoveCallback(event){
		if(document.pointerLockElement === canvas ||
		   document.mozPointerLockElement === canvas ||
		   document.webkitPointerLockElement === canvas)
		{
			Controls.lookLeftRight(-mouseSensitivityX*event.movementX);
			Controls.lookUpDown(-mouseSensitivityY*event.movementY);
		}
	}
	
	return {
		
		eye: eye,
		at:  at,
		up:  up,
		dir: dir,
		
		aspect	:aspect,
		fovy	:fovy,
		near	:near,
		far		:far,
		
		moveLeftBool: moveLeftBool,
		moveRightBool: moveRightBool,
		moveUpBool: moveUpBool,
		moveDownBool: moveDownBool,
		moveForwardBool: moveForwardBool,
		moveBackwardBool: moveBackwardBool,
		
		moveForwardBackward:moveForwardBackward,
		moveUpDown:moveUpDown,
		moveLeftRight:moveLeftRight,
		lookLeftRight:lookLeftRight,
		lookUpDown:lookUpDown,
		
		move:move,
		update:update,
		keydownCallback:keydownCallback,
		keyupCallback:keyupCallback,
		mousedownCallback:mousedownCallback,
		mousemoveCallback:mousemoveCallback,
		
		modelView: modelView,
		projection: projection
		
	}
}


// no clip control functions
function NoclipControls (init_eye, init_at, init_up) {
	
	var normalControls = new NormalControls(init_eye, init_at, init_up);
	
	// camera position
	var eye = init_eye;
	var at = init_at;
	var up = init_up;
	
	// perspective settings
	var aspect;
	var fovy = 70;
	var near = 0.01;
	var far = 200;
	
	var moveLeftBool = false;		// should be changed by keydown even listener
	var moveRightBool = false;		// should be changed by keydown even listener
	var moveUpBool = false;			// should be changed by keydown even listener
	var moveDownBool = false;		// should be changed by keydown even listener
	var moveForwardBool = false;	// should be changed by keydown even listener
	var moveBackwardBool = false;	// should be changed by keydown even listener
	var spd = 0.01; // distance per milisecond
	var dt; // time in miliseconds - passed at every frame (dt since last frame)
	var dir = vec3(0,0,0);
	
	// move in the direction you are looking in; including up and down
	function moveForwardBackward(backwardsBool){
		var tempDirection;
			
		if (backwardsBool) 	tempDirection = subtract(this.eye,this.at);
		else 				tempDirection = subtract(this.at,this.eye);
		
		this.dir = add(this.dir,normalize(tempDirection));
	}
	
	// space moves up,
	function moveUpDown(downBoolean){
		
	}
	
	return {
		
		eye: eye,
		at:  at,
		up:  up,
		dir: normalControls.dir,
		
		aspect	:aspect,
		fovy	:fovy,
		near	:near,
		far		:far,
		
		moveLeftBool: moveLeftBool,
		moveRightBool: moveRightBool,
		moveUpBool: moveUpBool,
		moveDownBool: moveDownBool,
		moveForwardBool: moveForwardBool,
		moveBackwardBool: moveBackwardBool,
		
		moveForwardBackward:moveForwardBackward,
		moveUpDown:normalControls.moveUpDown,
		moveLeftRight:normalControls.moveLeftRight,
		lookLeftRight:normalControls.lookLeftRight,
		lookUpDown:normalControls.lookUpDown,
		
		move:normalControls.move,
		update:normalControls.update,
		keydownCallback:normalControls.keydownCallback,
		keyupCallback:normalControls.keyupCallback,
		mousedownCallback:normalControls.mousedownCallback,
		mousemoveCallback:normalControls.mousemoveCallback,
		
		modelView: Controls.modelView,
		projection: Controls.projection
	}
}




// function to compute rotation matrix about abitrary axis
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

// time manager
// called in render loop to calculate dt since last frame at each frame
function TimeManager(){
	
	var now;
	var dt; // time since last frame
	var previousTime; // timestamp from last frame
	
	now = Date.now();
	previousTime = now;
	
	// variables related to tracking the fps
	var fps = 0;
	var fpsNow = Date.now();
	var fpsThen = now;
	var fpsTemp
	var fpsCounter = 0;
	
	// call this to update the fps each frame - can then be retrieved from this.fps
	function updateFPS (){
		fpsNow = Date.now();
		if(fpsNow - fpsThen > 1000) {
			this.fps = Math.floor(1/(fpsTemp/fpsCounter)*100)/100;
			fpsThen = fpsNow;
			fpsTemp = 0;
			fpsCounter = 0;
		} else {
			fpsCounter++;
			fpsTemp += this.dt/1000;
		}
	}
	
	// call to advance time
	function advance (){
		this.now = Date.now();
		this.dt =  this.now-this.previousTime;
		this.previousTime = this.now;
	}
	
	return {
		now: now,
		dt: dt,
		previousTime: previousTime,
		fps: fps,
		
		updateFPS: updateFPS,
		advance: advance
	}
	
}


// this is my solution right now - here all the interactive event callbacks are set
function bindCallbacks(){

	canvas.onmousemove = Controls.mousemoveCallback;
	canvas.onmousedown = Controls.mousedownCallback;
	window.onkeydown = Controls.keydownCallback;
	window.onkeyup = Controls.keyupCallback;
	
	noclipButton.onclick = function (event){
		var aspect = Controls.aspect;
		if(noclip){
			Controls = new NormalControls(Controls.eye, Controls.at, Controls.up);
			Controls.aspect = aspect;
		} else {
			Controls = new NoclipControls(Controls.eye, Controls.at, Controls.up);
			Controls.aspect = aspect;
		}
		noclip = !noclip;
	}
	
	renderModeButton.onclick = function(event){
		if(World.renderMode == gl.TRIANGLES){
			World.renderMode = gl.LINES;
		}else if(World.renderMode == gl.LINES){
			World.renderMode = gl.TRIANGLES;
		}
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




