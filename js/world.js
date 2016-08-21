"use strict"


///TODO: 
/*

Further optimisations that could be implemented:
Check blocks in neighbouring chunks during mesh creation
	- redo! only get neighbour chunk ONCE per chunk, not once per block!!!!

Things I should definitely do:
Frustum culling - see function for notes
Perlin noise aka. landscape generation

*/



// World namespace
function WorldManager(gl, shaderProgram, fCam){
	
	// Debugging var isInFrustum = true;
	var counter = 0;
	
	// WebGL context
	var gl = gl;
	var shaderProgram = shaderProgram;
	var renderMode = gl.LINES;
	var rebuildAll = false;
	
	// Chunk management lists
	var chunks = {};				// list of all the chunks
	var chunkLoadList = [];			// list of chunks that are yet to be loaded (delay to improve framerate during loading)
	var chunkSetupList = [];		// list of chunks that are loaded but not setup (set material type, landscape generation, etc.)
	var chunkRebuildList = [];		// list of chunks that changed since last frame (e.g. by picking)
	var chunkUnloadList = [];		// list of chunks that need to be removed
	var chunkRenderList = [];		// list of chunks that are rendered next frame
	var numChunks;					// public property giving the number of chunks loaded
	
	// frustum camera
	var frustumCam = fCam;
	
	function UpdateChunkLoadList(self){
		var loadCount = 0;
		chunkLoadList.forEach(function (e, i, array){
			if (loadCount < MAX_CHUNKS_PER_FRAME) {
				e.Load();
				loadCount++;
			}
		});
		chunkLoadList = [];
	}
	
	function UpdateChunkSetupList(self){
		var setupCount = 0;
		chunkSetupList.forEach(function (e, i, array){
			if(setupCount < MAX_CHUNKS_PER_FRAME){
				e.Setup();
				setupCount++;
				
				// Rebuild all neighbours when a new chunk is setup? Horrible idea... way too slow.
				//var neighbourChunks = [];
				//if (neighbourChunks[0] != undefined) neighbourChunks.push(chunks[chunkPosition[0]+1,chunkPosition[1],chunkPosition[2]]);
				//if (neighbourChunks[1] != undefined) neighbourChunks.push(chunks[chunkPosition[0]-1,chunkPosition[1],chunkPosition[2]]);
				//if (neighbourChunks[2] != undefined) neighbourChunks.push(chunks[chunkPosition[0],chunkPosition[1]+1,chunkPosition[2]]);
				//if (neighbourChunks[3] != undefined) neighbourChunks.push(chunks[chunkPosition[0],chunkPosition[1]-1,chunkPosition[2]]);
				//if (neighbourChunks[4] != undefined) neighbourChunks.push(chunks[chunkPosition[0],chunkPosition[1],chunkPosition[2]+1]);
				//if (neighbourChunks[5] != undefined) neighbourChunks.push(chunks[chunkPosition[0],chunkPosition[1],chunkPosition[2]-1]);
				//
				//neighbourChunks.forEach(function (e,i,a){
				//	e.needsRebuild = true;
				//});
				
			}
		});
		
		chunkSetupList = [];
	}
	
	function UpdateChunkRebuildList(self){
		chunkRebuildList.forEach(function (e, i, array){
			e.CreateMesh(shaderProgram);
		});
		chunkRebuildList = [];
		self.rebuildAll = false;
	}
	
	function UpdateChunkUnloadList(self){
		chunkUnloadList.forEach(function (e, i, array){
			var key = e.chunkPosition;
			chunks[key] = null;
			delete(chunks[key]);
			e.Unload();
			
		});
		chunkUnloadList = [];
	}
	
	function UpdateChunkRenderList(self){
		
		for (var i = 0; i < chunkRenderList.length; i++){
			chunkRenderList[i].Render(shaderProgram, self.renderMode);
		}
		chunkRenderList = [];
	}
	
	function UpdateChunkVisibilityList(self){
		var isLoaded;
		var isSetup;
		var needsRebuild;
		var isVisible;
		var e;
		
		// update chunk coordinate of the current player world coordinate
		var currentChunkCoord = worldCoordsToChunkCoords(Camera.eye);
		
		if (chunks[currentChunkCoord] == undefined) {
			chunks[currentChunkCoord] = new Chunk(currentChunkCoord);
		}
		
		for(var key in chunks){
			
			// Get this chunks coordinates and the neighbouring chunk coordinates
			var thisChunk = chunks[key];
			var thisChunkCoord = thisChunk.chunkPosition;
			
			var vecToChunk;
			var squareDistToChunk;
			
			// Unload chunk if it is too far away
			vecToChunk = subtract(currentChunkCoord,thisChunkCoord);
			squareDistToChunk = dot(vecToChunk,vecToChunk);
			if(squareDistToChunk > CHUNK_UNLOAD_RADIUS){
				chunkUnloadList.push(thisChunk);
			} else {
				
				var neighbourChunkCoords = [];
				neighbourChunkCoords.push([thisChunkCoord[0]+1,thisChunkCoord[1],thisChunkCoord[2]]);
				neighbourChunkCoords.push([thisChunkCoord[0]-1,thisChunkCoord[1],thisChunkCoord[2]]);
				neighbourChunkCoords.push([thisChunkCoord[0],thisChunkCoord[1]+1,thisChunkCoord[2]]);
				neighbourChunkCoords.push([thisChunkCoord[0],thisChunkCoord[1]-1,thisChunkCoord[2]]);
				neighbourChunkCoords.push([thisChunkCoord[0],thisChunkCoord[1],thisChunkCoord[2]+1]);
				neighbourChunkCoords.push([thisChunkCoord[0],thisChunkCoord[1],thisChunkCoord[2]-1]);
				
				// Load neighbouring chunks if they are close enough
				neighbourChunkCoords.forEach(function (e,i,a) {
					if (chunks[e] == undefined){
						vecToChunk = subtract(currentChunkCoord,e);
						squareDistToChunk = dot(vecToChunk,vecToChunk);
						if(squareDistToChunk < CHUNK_LOAD_RADIUS){
							chunks[e] = new Chunk(e);
						}
					}
				});
				
				
				isLoaded = thisChunk.isLoaded;
				isSetup = thisChunk.isSetup;
				needsRebuild = thisChunk.needsRebuild || self.rebuildAll;
				
				if(chunks[key].ShouldRender()) chunkRenderList.push(chunks[key]);
				if(!isLoaded) chunkLoadList.push(thisChunk);
				if(!isSetup) chunkSetupList.push(thisChunk);
				if(isLoaded && isSetup && needsRebuild) chunkRebuildList.push(thisChunk);
			}
		}
	}
	
	function Update(){
		
		UpdateChunkVisibilityList(this);
		UpdateChunkLoadList(this);
		UpdateChunkSetupList(this);
		UpdateChunkRebuildList(this);
		UpdateChunkUnloadList(this);
		UpdateChunkRenderList(this);
		this.numChunks = Object.keys(chunks).length;
		
	}
	
	// takes woorld coord and converts it to chunk coords (vec3) use for indexing the chunks list
	function worldCoordsToChunkCoords(pos){
		var result = [];
		result[0] = Math.floor(pos[0]/CHUNK_SIZE);
		result[1] = Math.floor(pos[1]/CHUNK_SIZE);
		result[2] = Math.floor(pos[2]/CHUNK_SIZE);
		return result;
	}
	
	function chunkCoordsToWorldCoords(chunkPosition){
		var result = [];
		result[0] = chunkPosition[0]*CHUNK_SIZE;
		result[1] = chunkPosition[1]*CHUNK_SIZE;
		result[2] = chunkPosition[2]*CHUNK_SIZE;
		return result;
	}
	
	// retrieve block at given position
	function getBlock(pos){
		var chunkCoords = worldCoordsToChunkCoords(pos);
		var chunk = chunks[chunkCoords];
		var internalCoord = vec3(pos[0]-chunkCoords[0]*CHUNK_SIZE, pos[1]-chunkCoords[1]*CHUNK_SIZE, pos[2]-chunkCoords[2]*CHUNK_SIZE);
		if(chunk != undefined && chunk.isLoaded) return chunk.blocks[internalCoord[0]][internalCoord[1]][internalCoord[2]];
		return false;
	}
	
	// Chunk object - this is where the magic happens
	function Chunk(chunkPosition){
		var chunkPosition = chunkPosition; // coordinates of the chunk offset (vec2)
		var blocks = [];
		
		// information variables
		var needsRebuild = true;
		var isLoaded = false;
		var isSetup = false;
		var isEmpty = true;
		var fullChunkFaces = [true, true, true, true, true, true]; // booleans used to not render completely surrounded chunks
		
		// Create the vertex buffer
		var vBuffer = gl.createBuffer();
		var vPositionLoc;
		var points = [];
		
		// Create the color buffer
		var cBuffer = gl.createBuffer();
		var vColorLoc;
		var colors = [];
		
		// Create the normals buffer
		var nBuffer = gl.createBuffer();
		var vNormalLoc;
		var normals = [];
		
		function CreateMesh(shaderProgram){
			
			this.needsRebuild = false;
			
			// reset vertex buffer arrays
			points = [];
			colors = [];
			normals = [];
			
			var checkForFullChunkFace = [false, false, false, false, false, false];
			// used to check blocks in neighbouring chunks
			//var neighbourChunks = [];
			//neighbourChunks[0] = chunks[chunkPosition[0]+1,chunkPosition[1],chunkPosition[2]];
			//neighbourChunks[1] = chunks[chunkPosition[0]-1,chunkPosition[1],chunkPosition[2]];
			//neighbourChunks[2] = chunks[chunkPosition[0],chunkPosition[1]+1,chunkPosition[2]];
			//neighbourChunks[3] = chunks[chunkPosition[0],chunkPosition[1]-1,chunkPosition[2]];
			//neighbourChunks[4] = chunks[chunkPosition[0],chunkPosition[1],chunkPosition[2]+1];
			//neighbourChunks[5] = chunks[chunkPosition[0],chunkPosition[1],chunkPosition[2]-1];
			
			for(var i = 0; i < CHUNK_SIZE; i++) {
				
				if (i == 0) checkForFullChunkFace[0] = true;
				else checkForFullChunkFace[0] = false;
				if (i == CHUNK_SIZE-1) checkForFullChunkFace[1] = true;
				else checkForFullChunkFace[1] = false;
				
				for(var j = 0; j < CHUNK_SIZE; j++) {
					
					if (j == 0)	checkForFullChunkFace[2] = true;
					else checkForFullChunkFace[2] = false;
					if (j == CHUNK_SIZE-1) checkForFullChunkFace[3] = true;
					else checkForFullChunkFace[3] = false;
					
					for(var k = 0; k < CHUNK_SIZE; k++) {
						
						if (k == 0) checkForFullChunkFace[4] = true;
						else checkForFullChunkFace[4] = false;
						if (k == CHUNK_SIZE-1) checkForFullChunkFace[5] = true;
						else checkForFullChunkFace[5] = false;
						
						// is the block empty?
						if (blocks[i][j][k] != BLOCK_TYPES.DEFAULT){
							// boolean array used for culling faces; index order is:
							// +x, -x, +y, -y, +z, -z
							var shouldDraw = [];
							
							// check if the block has neighbours within chunk
							shouldDraw[0] = (i+1 >= CHUNK_SIZE	|| blocks[i+1][j][k] == BLOCK_TYPES.DEFAULT);
							shouldDraw[1] = (i-1 < 0			|| blocks[i-1][j][k] == BLOCK_TYPES.DEFAULT);
							shouldDraw[2] = (j+1 >= CHUNK_SIZE	|| blocks[i][j+1][k] == BLOCK_TYPES.DEFAULT);
							shouldDraw[3] = (j-1 < 0			|| blocks[i][j-1][k] == BLOCK_TYPES.DEFAULT);
							shouldDraw[4] = (k+1 >= CHUNK_SIZE	|| blocks[i][j][k+1] == BLOCK_TYPES.DEFAULT);
							shouldDraw[5] = (k-1 < 0			|| blocks[i][j][k-1] == BLOCK_TYPES.DEFAULT);
							
							//check if blocks at the border have neighbours in neighbouring chunks
							
							
							//if (neighbourChunks[0] != undefined && neighbourChunks[0].isLoaded && neighbourChunks[0].isSetup && shouldDraw[0] && i+1 >= CHUNK_SIZE) shouldDraw[0] = neighbourChunks[0].blocks[0][j][k] 				== BLOCK_TYPES.DEFAULT;
							//if (neighbourChunks[1] != undefined && neighbourChunks[1].isLoaded && neighbourChunks[1].isSetup && shouldDraw[1] && i-1 < 0) 			shouldDraw[1] = neighbourChunks[1].blocks[CHUNK_SIZE-1][j][k]	== BLOCK_TYPES.DEFAULT;
							//if (neighbourChunks[2] != undefined && neighbourChunks[2].isLoaded && neighbourChunks[2].isSetup && shouldDraw[2] && j+1 >= CHUNK_SIZE) shouldDraw[2] = neighbourChunks[2].blocks[i][0][k] 				== BLOCK_TYPES.DEFAULT;
							//if (neighbourChunks[3] != undefined && neighbourChunks[3].isLoaded && neighbourChunks[3].isSetup && shouldDraw[3] && j-1 < 0) 			shouldDraw[3] = neighbourChunks[3].blocks[i][CHUNK_SIZE-1][k]	== BLOCK_TYPES.DEFAULT;
							//if (neighbourChunks[4] != undefined && neighbourChunks[4].isLoaded && neighbourChunks[4].isSetup && shouldDraw[4] && k+1 >= CHUNK_SIZE) shouldDraw[4] = neighbourChunks[4].blocks[i][j][0] 				== BLOCK_TYPES.DEFAULT;
							//if (neighbourChunks[5] != undefined && neighbourChunks[5].isLoaded && neighbourChunks[5].isSetup && shouldDraw[5] && k-1 < 0) 			shouldDraw[5] = neighbourChunks[5].blocks[i][j][CHUNK_SIZE-1]	== BLOCK_TYPES.DEFAULT;
							
							
							createCube([i,j,k], shouldDraw);
							
						} else {
							
							// set flag indicating if the chunk face is full
							if (checkForFullChunkFace[0]) this.fullChunkFaces[0] = false;
							if (checkForFullChunkFace[1]) this.fullChunkFaces[1] = false;
							if (checkForFullChunkFace[2]) this.fullChunkFaces[2] = false;
							if (checkForFullChunkFace[3]) this.fullChunkFaces[3] = false;
							if (checkForFullChunkFace[4]) this.fullChunkFaces[4] = false;
							if (checkForFullChunkFace[5]) this.fullChunkFaces[5] = false;
							
						}
					}
				}
			}
			
			// Check if we created any blocks
			this.isEmpty = points.length == 0;
			
			// Create and configure the vertex buffer
			gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );
			
			vPositionLoc = gl.getAttribLocation( shaderProgram, "vPosition" );
			gl.vertexAttribPointer( vPositionLoc, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vPositionLoc );
			
			// Create and configure the color buffer
			gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
			
			vColorLoc = gl.getAttribLocation( shaderProgram, "vColor" );
			gl.vertexAttribPointer( vColorLoc, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vColorLoc );
			
			// Create and configure the color buffer
			gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW );
			
			vNormalLoc = gl.getAttribLocation( shaderProgram, "vNormal" );
			gl.vertexAttribPointer( vNormalLoc, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vNormalLoc );
			
		}
		
		function Render(shaderProgram, mode){
			
			// Make sure the correct shader is used
			gl.useProgram(shaderProgram);
			
			// Re-associate this chunks vertex buffer with the shader program
			gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
			gl.vertexAttribPointer( vPositionLoc, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vPositionLoc );
			
			// Re-associate this chunks color buffer with the shader program
			gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
			gl.vertexAttribPointer( vColorLoc, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vColorLoc );
			
			// Re-associate this chunks normals buffer with the shader program
			gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
			gl.vertexAttribPointer( vNormalLoc, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vNormalLoc );
			
			// Draw the stuff
			gl.drawArrays( mode, 0, points.length );
			
			return true;
		}
		
		function createCube(blockPosition, shouldDraw) {
			if (shouldDraw[0]) quad( 2, 3, 7, 6, blockPosition, [ 1.0,  0.0,  0.0, 0.0] ); // positive x face
			if (shouldDraw[1]) quad( 5, 4, 0, 1, blockPosition, [-1.0,  0.0,  0.0, 0.0] ); // negative x face
			if (shouldDraw[2]) quad( 6, 5, 1, 2, blockPosition, [ 0.0,  1.0,  0.0, 0.0] ); // positive y face
			if (shouldDraw[3]) quad( 3, 0, 4, 7, blockPosition, [ 0.0, -1.0,  0.0, 0.0] ); // negative y face
			if (shouldDraw[4]) quad( 1, 0, 3, 2, blockPosition, [ 0.0,  0.0,  1.0, 0.0] ); // positive z face
			if (shouldDraw[5]) quad( 4, 5, 6, 7, blockPosition, [ 0.0,  0.0, -1.0, 0.0] ); // negative z face
		}
		
		function quad(a, b, c, d, blockPosition, normal) {
			
			var indices = [ a, b, c, a, c, d ];
			
			var color = normal;
			color[3] = 1;
			
			// Check if normal is facing within 90 deg towards the view
			for ( var i = 0; i < indices.length; ++i ) {
				var pos = [];
				pos[0] = vertices[indices[i]][0] + blockPosition[0] + chunkPosition[0]*CHUNK_SIZE;
				pos[1] = vertices[indices[i]][1] + blockPosition[1] + chunkPosition[1]*CHUNK_SIZE;
				pos[2] = vertices[indices[i]][2] + blockPosition[2] + chunkPosition[2]*CHUNK_SIZE;
				pos[3] = vertices[indices[i]][3];
				
				points.push( pos );
				colors.push( color );
				normals.push( normal );
			}
			
		}
		
		function getNormal(p1,p2,p3){
			var result = normalize(cross(subtract(p1,p2),subtract(p1,p3)));
			result.push(0);
			return result;
		}
		
		function Load(){
			this.isLoaded = true;
			
			// initialize block array
			var blocks = [];
			
			// information variables
			var needsRebuild = true;
			var isLoaded = false;
			var isSetup = false;
			var isEmpty = true;
			var fullChunkFaces = [true, true, true, true, true, true]; // booleans used to not render completely surrounded chunks
			
			// Create the vertex buffer
			var vBuffer = gl.createBuffer();
			var vPositionLoc;
			var points = [];
			
			// Create the color buffer
			var cBuffer = gl.createBuffer();
			var vColorLoc;
			var colors = [];
			
			// Create the normals buffer
			var nBuffer = gl.createBuffer();
			var vNormalLoc;
			var normals = [];
			
		}
		
		function Unload(){
			this.isLoaded = false;
			
			var chunkPosition = null; // coordinates of the chunk offset (vec2)
			var blocks = null;
			
			// information variables
			var needsRebuild = null;
			var isLoaded = null;
			var isSetup = null;
			var isEmpty = null;
			var fullChunkFaces = null; // booleans used to not render completely surrounded chunks
			
			// Create the vertex buffer
			var vBuffer = null;
			var vPositionLoc = null;;
			var points = null;
			
			// Create the color buffer
			var cBuffer = null;
			var vColorLoc = null;;
			var colors = null;
			
			// Create the normals buffer
			var nBuffer = null;
			var vNormalLoc = null;;
			var normals = null;
		}
		
		function Setup(){
			
			// Generate empty blocks throughout the chunk - replace with some more interesting world gen later
			for(var i = 0; i < CHUNK_SIZE; i++) {
				blocks[i] = [];
				for(var j = 0; j < CHUNK_SIZE; j++) {
					blocks[i][j] = [];
					for(var k = 0; k < CHUNK_SIZE; k++) {
						blocks[i][j][k] = BLOCK_TYPES.GRASS;
						/*if(
							i == 0
						||	j == 0
						||	k == 0
						||	i == CHUNK_SIZE-1
						||	j == CHUNK_SIZE-1
						||	k == CHUNK_SIZE-1
						){
							blocks[i][j][k] = BLOCK_TYPES.DEFAULT;
						}*/
					}
				}
			}
			this.isEmpty = false;
			this.isSetup = true;
			
		}
		
		function ShouldRender(){
			
			// get neighbouring chunks and check if this one is completely surrounded
			var isSurrounded = true;
			var neighbourChunks = [];
			neighbourChunks.push(chunks[[chunkPosition[0]+1,chunkPosition[1],chunkPosition[2]]]);
			neighbourChunks.push(chunks[[chunkPosition[0]-1,chunkPosition[1],chunkPosition[2]]]);
			neighbourChunks.push(chunks[[chunkPosition[0],chunkPosition[1]+1,chunkPosition[2]]]);
			neighbourChunks.push(chunks[[chunkPosition[0],chunkPosition[1]-1,chunkPosition[2]]]);
			neighbourChunks.push(chunks[[chunkPosition[0],chunkPosition[1],chunkPosition[2]+1]]);
			neighbourChunks.push(chunks[[chunkPosition[0],chunkPosition[1],chunkPosition[2]-1]]);
			
			isSurrounded = isSurrounded && neighbourChunks[0] != undefined && neighbourChunks[0].fullChunkFaces[1] && !neighbourChunks[0].needsRebuild;
			isSurrounded = isSurrounded && neighbourChunks[1] != undefined && neighbourChunks[1].fullChunkFaces[0] && !neighbourChunks[1].needsRebuild;
			isSurrounded = isSurrounded && neighbourChunks[2] != undefined && neighbourChunks[2].fullChunkFaces[3] && !neighbourChunks[2].needsRebuild;
			isSurrounded = isSurrounded && neighbourChunks[3] != undefined && neighbourChunks[3].fullChunkFaces[2] && !neighbourChunks[3].needsRebuild;
			isSurrounded = isSurrounded && neighbourChunks[4] != undefined && neighbourChunks[4].fullChunkFaces[5] && !neighbourChunks[4].needsRebuild;
			isSurrounded = isSurrounded && neighbourChunks[5] != undefined && neighbourChunks[5].fullChunkFaces[4] && !neighbourChunks[5].needsRebuild;
			
			// Do frustum culling here...
			var isInFrustum = World.frustumCam.CullSquareTest(chunkCoordsToWorldCoords(chunkPosition), CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE);
			
			//console.log(this.frustumCam.eye);
			
			return this.isSetup && this.isLoaded && !this.isEmpty && !isSurrounded && isInFrustum;
		}
		
		// interface for Chunk
		return {
			chunkPosition,
			blocks : blocks,
			needsRebuild: needsRebuild,
			isLoaded: isLoaded,
			isSetup: isSetup,
			isEmpty: isEmpty,
			fullChunkFaces: fullChunkFaces,
			ShouldRender: ShouldRender,
			Render : Render,
			CreateMesh: CreateMesh,
			Load: Load,
			Unload: Unload,
			Setup: Setup
		}
	}
	
	// interface for WorldManager
	return {
		
		renderMode: renderMode,
		getBlock: getBlock,
		rebuildAll: rebuildAll,
		numChunks: numChunks,
		frustumCam : frustumCam,
		Chunk : Chunk,
		Update: Update
		
	}
}

// vertices for each block
var vertices = [
	[-0.5, -0.5,  0.5, 1.0 ], // 0 - l, b, f
	[-0.5,  0.5,  0.5, 1.0 ], // 1 - l, t, f
	[ 0.5,  0.5,  0.5, 1.0 ], // 2- r, t, f
	[ 0.5, -0.5,  0.5, 1.0 ], // 3- r, b, f
	[-0.5, -0.5, -0.5, 1.0 ], // 4- l, b, b
	[-0.5,  0.5, -0.5, 1.0 ], // 5- l, t, b
	[ 0.5,  0.5, -0.5, 1.0 ], // 6- r, t, b
	[ 0.5, -0.5, -0.5, 1.0 ]  // 7 - r, b, b
];

// "enum" for block types
var BLOCK_TYPES = {
	
	DEFAULT:	"0",
	GRASS:		"1",
	DIRT:		"2",
	WATER:		"3",
	STONE:		"4",
	WOOD:		"5",
	SAND:		"6",
	
}