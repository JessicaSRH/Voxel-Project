
///
///Copyright (c) 2016 Johnny Skaarup Redzin Hansen
///
///Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
///associated documentation files (the "Software"), to deal in the Software without restriction, including
///without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
///copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to
///the following conditions:
///
///The above copyright notice and this permission notice shall be included in all copies or substantial
///portions of the Software.
///
///THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
///LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
///EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
///IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
///THE USE OR OTHER DEALINGS IN THE SOFTWARE.
///

"use strict"

// Camera type enum
const CAMERA_TYPES = {
	FRUSTUM : "0",
	ORTHO : "1",
}

// camera object
function Frustum(init_eye, init_at, init_up, init_fovy, init_near, init_far, init_aspect){
	
	// Set the camera type
	const CAMERA_TYPE = CAMERA_TYPES.FRUSTUM;
	
	const SIDES = {
		TOP:	0,
		BOTTOM:	1,
		LEFT:	2,
		RIGHT:	3,
		FAR:	4,
		NEAR:	5
	}
	
	// camera position
	var eye = init_eye;
	var at 	= init_at;
	var up 	= init_up;
	
	// perspective settings
	var aspect 	= init_aspect;
	var fovy 	= init_fovy;
	var near 	= init_near;
	var far 	= init_far;
	
	// main transformation matrices into this camera space
	var modelView = mat4();
	var projection = mat4();
	
	// width and height near and far frustum planes
	var nearHeight;
	var nearWidth ;
	var farHeight ;
	var farWidth  ;
	
	// viewing direction
	var d;
	
	// right vector
	var r;
	
	// frustum plane centres
	var fc;
	var nc;
	
	// frustum corners
	var ftl;
	var ftr;
	var fbl;
	var fbr;
	var ntl;
	var ntr;
	var nbl;
	var nbr;
	
	// planes
	var planes = [];
	
	// debugging counter
	var counter = 0;
	
	
	function Update(){
		
		// Set up the modelView and projection matrices
		this.modelView = lookAt(this.eye,this.at,this.up);
		this.projection = perspective( this.fovy, this.aspect, this.near, this.far )
		
		// compute the sizes of the near and far planes
		nearHeight = 2.0 * Math.tan((this.fovy*Math.PI/180) / 2.0) * this.near*1.00; // adding 5% to avoid weird boundary bug
		nearWidth  = nearHeight * aspect;
		farHeight  = 2.0 * Math.tan((this.fovy*Math.PI/180) / 2.0) * this.far*1.00; // adding 5% to avoid weird boundary bug
		farWidth   = farHeight * aspect;
		
		// viewing direction
		d = normalize(subtract(this.at,this.eye));
		
		// right vector
		r = normalize(cross(this.up,d));
		
		// compute the centers of the near and far planes
		fc = [this.eye[0] + d[0] * this.far , this.eye[1] + d[1]*this.far , this.eye[2] + d[2] * this.far ];
		nc = [this.eye[0] + d[0] * this.near, this.eye[1] + d[1]*this.near, this.eye[2] + d[2] * this.near];
		
		// compute the corners of the frustum
		this.ftl = [fc[0]+(this.up[0]*farHeight/2)-(r[0]*farWidth/2), fc[1]+(this.up[1]*farHeight/2)-(r[1]*farWidth/2), fc[2]+(this.up[2]*farHeight/2)-(r[2]*farWidth/2)];
		this.ftr = [fc[0]+(this.up[0]*farHeight/2)+(r[0]*farWidth/2), fc[1]+(this.up[1]*farHeight/2)+(r[1]*farWidth/2), fc[2]+(this.up[2]*farHeight/2)+(r[2]*farWidth/2)];
		this.fbl = [fc[0]-(this.up[0]*farHeight/2)-(r[0]*farWidth/2), fc[1]-(this.up[1]*farHeight/2)-(r[1]*farWidth/2), fc[2]-(this.up[2]*farHeight/2)-(r[2]*farWidth/2)];
		this.fbr = [fc[0]-(this.up[0]*farHeight/2)+(r[0]*farWidth/2), fc[1]-(this.up[1]*farHeight/2)+(r[1]*farWidth/2), fc[2]-(this.up[2]*farHeight/2)+(r[2]*farWidth/2)];
		
		this.ntl = [nc[0]+(this.up[0]*nearHeight/2)-(r[0]*nearWidth/2), nc[1]+(this.up[1]*nearHeight/2)-(r[1]*nearWidth/2), nc[2]+(this.up[2]*nearHeight/2)-(r[2]*nearWidth/2), ];
		this.ntr = [nc[0]+(this.up[0]*nearHeight/2)+(r[0]*nearWidth/2), nc[1]+(this.up[1]*nearHeight/2)+(r[1]*nearWidth/2), nc[2]+(this.up[2]*nearHeight/2)+(r[2]*nearWidth/2), ];
		this.nbl = [nc[0]-(this.up[0]*nearHeight/2)-(r[0]*nearWidth/2), nc[1]-(this.up[1]*nearHeight/2)-(r[1]*nearWidth/2), nc[2]-(this.up[2]*nearHeight/2)-(r[2]*nearWidth/2), ];
		this.nbr = [nc[0]-(this.up[0]*nearHeight/2)+(r[0]*nearWidth/2), nc[1]-(this.up[1]*nearHeight/2)+(r[1]*nearWidth/2), nc[2]-(this.up[2]*nearHeight/2)+(r[2]*nearWidth/2), ];
		
		planes = [];
		planes.push(new Plane(this.ntr, this.ntl, this.ftl));
		planes.push(new Plane(this.nbl, this.nbr, this.fbr));
		planes.push(new Plane(this.ntl, this.nbl, this.fbl));
		planes.push(new Plane(this.nbr, this.ntr, this.fbr));
		planes.push(new Plane(this.ntl, this.ntr, this.nbr));
		planes.push(new Plane(this.ftr, this.ftl, this.fbl));
		
	}
	
	function RenderCamera(gl, shaderFrustum){
		
		//console.log(this.ntl);
		
		var points = [	this.ntl, this.ntr,
						this.ntr, this.nbr,
						this.nbr, this.nbl,
						this.nbl, this.ntl,
						this.ftl, this.ftr,
						this.ftr, this.fbr,
						this.fbr, this.fbl,
						this.fbl, this.ftl,
						this.ntl, this.ftl,
						this.nbl, this.fbl,
						this.ntr, this.ftr,
						this.nbr, this.fbr,
						this.nbl, this.ftl,
						this.ntl, this.fbl,
						this.nbr, this.ftr,
						this.ntr, this.fbr,
						this.ntl, this.ftr,
						this.ntr, this.ftl,
						this.nbl, this.fbr,
						this.nbr, this.fbl,
						this.nbl, this.ntr,
						this.nbr, this.ntl,
						this.fbl, this.ftr,
						this.fbr, this.ftl
					];
		//var points = [[0,0,0],this.ntl];
		//var points = [[0,0,0],[-1,-1,-1]];
		for (var i = 0; i < points.length; i++) points[i][3] = 1;
		
		var colors = [];
		for (var i = 0; i < points.length; i++) colors.push([1, 0, 0, 1]);
		
		// Create the vertex and uniform objects
		var vertexBuffers = [new vertextAttributeObject("vPosition", 4), new vertextAttributeObject("vColor", 4)];
		var vertexAttrValues = [points, colors];
		
		var uniformObjects = [new vertexUniformObject("modelView", UNIFORM_TYPE.MATRIX_4), new vertexUniformObject("projection", UNIFORM_TYPE.MATRIX_4)];
		var uniformValues = [Camera.modelView, Camera.projection];
		
		render(gl, shaderFrustum, gl.LINES, uniformObjects, uniformValues, vertexBuffers, vertexAttrValues);
		
	}
	
	// pos is the lower left position, x is the extension in the x-dimension, similarly for x and y
	// true if inside (or intesecting), false if outside
	function CullSquareTest (p, x, y, z){
		
		var points = [];
		points.push([p[0]  , p[1]  , p[2]  ]);
		points.push([p[0]+x, p[1]  , p[2]  ]);
		points.push([p[0]  , p[1]+y, p[2]  ]);
		points.push([p[0]  , p[1]  , p[2]+z]);
		points.push([p[0]+x, p[1]+y, p[2]  ]);
		points.push([p[0]+x, p[1]  , p[2]+z]);
		points.push([p[0]  , p[1]+y, p[2]+z]);
		points.push([p[0]+x, p[1]+y, p[2]+z]);
		
		var result = true;
		
		for	(var i = 0; i < planes.length; i++){
			var allPointsOutsidePlane = true;
			
			for(var j = 0; j < points.length; j++){
				if (planes[i].distance(points[j]) < 0) allPointsOutsidePlane = false;
			}
			
			if(allPointsOutsidePlane) result = false;
		}
		
		return result;
		
	}
	
	// true if inside (or intesecting), false if outside
	function CullPointTest (p){
		if (planes[SIDES.TOP   ].distance(p) >= 0) return false;
		if (planes[SIDES.BOTTOM].distance(p) >= 0) return false;
		if (planes[SIDES.LEFT  ].distance(p) >= 0) return false;
		if (planes[SIDES.RIGHT ].distance(p) >= 0) return false;
		if (planes[SIDES.FAR   ].distance(p) >= 0) return false;
		if (planes[SIDES.NEAR  ].distance(p) >= 0) return false;
		return true;
	}
	
	return {
		
		eye: eye,
		at:  at,
		up:  up,
		
		aspect	:aspect,
		fovy	:fovy,
		near	:near,
		far		:far,
		
		modelView: modelView,
		projection: projection,
		
		Update : Update,
		CullSquareTest : CullSquareTest,
		RenderCamera : RenderCamera,
		
		type : CAMERA_TYPE,
		
		ftl : ftl,
		ftr : ftr,
		fbl : fbl,
		fbr : fbr,
		ntl : ntl,
		ntr : ntr,
		nbl : nbl,
		nbr : nbr
		
	}
	
}



// normal control object
function NormalControls (camera) {
	
	// camera object
	var camera = camera;
	
	// movement booleans
	var moveLeftBool = false;		// should be changed by keydown even listener
	var moveRightBool = false;		// should be changed by keydown even listener
	var moveUpBool = false;			// should be changed by keydown even listener
	var moveDownBool = false;		// should be changed by keydown even listener
	var moveForwardBool = false;	// should be changed by keydown even listener
	var moveBackwardBool = false;	// should be changed by keydown even listener
	
	// speed and direction variables.
	var spd = 0.02; // distance per milisecond
	var dt; // time in miliseconds - passed at every frame (dt since last frame)
	var dir = vec3(0,0,0); // reset every frame; holds the direction of movement in this frame
	
	// only this function should be called for movement
	function move (dt){
		this.dir = vec3(0,0,0);
		this.dt = dt;
		if(this.moveForwardBool){ this.moveForwardBackward(); }
		if(this.moveBackwardBool){ this.moveForwardBackward(true); }
		if(this.moveLeftBool){ this.moveLeftRight(); }
		if(this.moveRightBool){ this.moveLeftRight(true); }
		if(this.moveUpBool){ console.log("3"); } // implement jumping and gravity eventually
		if(this.moveDownBool){ console.log("4"); } // crouching I guess
		if (dot(this.dir,this.dir) != 0) this.updateCamera();
	}
	
	function moveForwardBackward(backwardsBool){
		var tempDirection;
			
		if (backwardsBool) 	tempDirection = subtract(Camera.eye,Camera.at);
		else 				tempDirection = subtract(Camera.at,Camera.eye);
		
		tempDirection[1] = 0; // lock y-movement
		
		this.dir = add(this.dir,normalize(tempDirection));
	}
	
	function moveUpDown(downBoolean){
		
	}
	
	function moveLeftRight(rightBool){
		if (rightBool) 	this.dir = add(this.dir,normalize(cross(subtract(Camera.at,Camera.eye), Camera.up)));
		else 			this.dir = add(this.dir,normalize(cross(subtract(Camera.eye,Camera.at), Camera.up)));
	}
	
	function lookLeftRight(theta){
		var r = vec3(0,1,0);
		var rotMat = rotateAxis(theta, r);
		Camera.at = subtract(Camera.at,Camera.eye);
		Camera.at = mult(rotMat, vec4(Camera.at[0], Camera.at[1], Camera.at[2], 1));
		Camera.at.pop();
		Camera.at = add(Camera.at,Camera.eye);
        
		Camera.up = mult(rotMat, vec4(Camera.up[0],Camera.up[1],Camera.up[2],0));
		Camera.up.pop();
	}

	function lookUpDown(theta){
		var r = normalize(cross(subtract(Camera.at,Camera.eye),Camera.up));
		var rotMat = rotateAxis(theta, r);
		var tempAt = Camera.at;
		var tempUp = Camera.up;
		tempAt = subtract(tempAt,Camera.eye);
		tempAt = mult(rotMat, vec4(tempAt[0], tempAt[1], tempAt[2], 1));
		tempAt.pop();
		tempAt = add(tempAt,Camera.eye);
		
		tempUp = mult(rotMat, vec4(tempUp[0],tempUp[1],tempUp[2],0));
		tempUp.pop();
		
		if(tempUp[1] > 0.00000001){ // slightly more than 0 to avoid rounding errors at the boundary
			Camera.up = tempUp;
			Camera.at = tempAt;
		}
	}
	
	function updateCamera(){
		Camera.dir = normalize(this.dir);
		Camera.eye[0] += this.dir[0]*this.speed*this.dt;
		Camera.eye[1] += this.dir[1]*this.speed*this.dt;
		Camera.eye[2] += this.dir[2]*this.speed*this.dt;
		Camera.at[0] += this.dir[0]*this.speed*this.dt;
		Camera.at[1] += this.dir[1]*this.speed*this.dt;
		Camera.at[2] += this.dir[2]*this.speed*this.dt;
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
			case 'r' : // F3
				event.preventDefault();
				if (devGuiElement.style.visibility == "visible") devGuiElement.style.visibility = "hidden";
				else devGuiElement.style.visibility = "visible";
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
			console.log("qwe");
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
		updateCamera: updateCamera,
		keydownCallback:keydownCallback,
		keyupCallback:keyupCallback,
		mousedownCallback:mousedownCallback,
		mousemoveCallback:mousemoveCallback,
		
		speed:spd,
		
		Camera: Camera
	}
}


// no clip control functions
function NoclipControls (init_eye, init_at, init_up) {
	
	var normalControls = new NormalControls(init_eye, init_at, init_up);
	
	var moveLeftBool = false;		// should be changed by keydown even listener
	var moveRightBool = false;		// should be changed by keydown even listener
	var moveUpBool = false;			// should be changed by keydown even listener
	var moveDownBool = false;		// should be changed by keydown even listener
	var moveForwardBool = false;	// should be changed by keydown even listener
	var moveBackwardBool = false;	// should be changed by keydown even listener
	var dt; // time in miliseconds - passed at every frame (dt since last frame)
	var dir = vec3(0,0,0);
	
	// move in the direction you are looking in; including up and down
	function moveForwardBackward(backwardsBool){
		var tempDirection;
			
		if (backwardsBool) 	tempDirection = subtract(Camera.eye,Camera.at);
		else 				tempDirection = subtract(Camera.at,Camera.eye);
		
		this.dir = add(this.dir,normalize(tempDirection));
	}
	
	// space moves up,
	function moveUpDown(downBoolean){
		
	}
	
	return {
		
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
		updateCamera:normalControls.updateCamera,
		keydownCallback:normalControls.keydownCallback,
		keyupCallback:normalControls.keyupCallback,
		mousedownCallback:normalControls.mousedownCallback,
		mousemoveCallback:normalControls.mousemoveCallback,
		
		speed : normalControls.speed,
		
		Camera: normalControls.Camera
		
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
		if(noclip){
			Controls = new NormalControls(Camera);
		} else {
			Controls = new NoclipControls(Camera);
		}
		noclip = !noclip;
	}
	
	renderModeButton.onclick = function(event){
		if(renderMode == gl.TRIANGLES){
			renderMode = gl.LINES;
		}else if(renderMode == gl.LINES){
			renderMode = gl.TRIANGLES;
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
	
	frustumButton.onclick = function(event){
		if (World.frustumCam == Camera) World.frustumCam = FrustumCamera;
		else World.frustumCam = Camera;
	}
	
	function fullscreenCallback (event){
		fullscreen = !fullscreen;
	}
	
	document.onmozfullscreenchange = fullscreenCallback;
	document.onwebkitfullscreenchange = fullscreenCallback;
	document.fullscreenchange = fullscreenCallback;
	
}







