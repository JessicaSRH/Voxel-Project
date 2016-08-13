


// normal control object
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
	var spd = 0.005; // distance per milisecond
	var dt; // time in miliseconds - passed at every frame (dt since last frame)
	
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
		move: function(dt){
			this.dt = dt;
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
			this.eye[0] += dir[0]*spd*this.dt;
			this.eye[1] += dir[1]*spd*this.dt;
			this.eye[2] += dir[2]*spd*this.dt;
			this.at[0] += dir[0]*spd*this.dt;
			this.at[1] += dir[1]*spd*this.dt;
			this.at[2] += dir[2]*spd*this.dt;
		},
		
		keydownCallback: function(event) {
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
		},
		
		keyupCallback: function(event) {
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
		},
		
		mousedownCallback: function (event) {
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
		},
		
		mousemoveCallback: function (event){
			if(document.pointerLockElement === canvas ||
			   document.mozPointerLockElement === canvas ||
			   document.webkitPointerLockElement === canvas)
			{
				Controls.lookLeftRight(-mouseSensitivityX*event.movementX);
				//console.log(Controls);
				Controls.lookUpDown(-mouseSensitivityY*event.movementY);
			}
		}
		
	}
}


// no clip control functions
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
	var spd = 0.005;
	var dt;
	
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
		
		move: function(dt_){
			dt = dt_;
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
			this.eye[0] += dir[0]*spd*dt;
			this.eye[1] += dir[1]*spd*dt;
			this.eye[2] += dir[2]*spd*dt;
			this.at[0] += dir[0]*spd*dt;
			this.at[1] += dir[1]*spd*dt;
			this.at[2] += dir[2]*spd*dt;
		}
		
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
	var updatesPerSecond;
	
	now = Date.now();
	previousTime = now;
	
	return {
		now: now,
		dt: dt,
		previousTime: previousTime,
		
		// call to advance time
		advance(){
			this.now = Date.now();
			this.dt =  this.now-this.previousTime;
			this.previousTime = this.now;
		}
		
	}
	
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




