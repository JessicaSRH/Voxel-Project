
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


// World namespace
function WorldManager(gl, shaderProgram, fCam){
	
	// WebGL context
	var gl = gl;
	var shaderProgram = shaderProgram;
	var rebuildAll = false;
	
	// Chunk management lists
	var chunks = {};				// list of all the chunks
	var chunkLoadList = [];			// list of chunks that are yet to be loaded (delay to improve framerate during loading)
	var chunkSetupList = [];		// list of chunks that are loaded but not setup (set material type, landscape generation, etc.)
	var chunkRebuildList = [];		// list of chunks that changed since last frame (e.g. by picking)
	var chunkUnloadList = [];		// list of chunks that need to be removed
	var chunkRenderList = [];		// list of chunks that are rendered next frame
	var numChunksSetup = 0;				// public property giving the number of chunks setup
	var numChunksRendered = 0;			// public property giving the number of chunks rendered
	
	// frustum camera
	var frustumCam = fCam;
	
	var Mesher = DefaultMesher;
	
	function UpdateChunkLoadList(self){
		var loadCount = 0;
		chunkLoadList.forEach(function (e, i, array){
			if (loadCount < MAX_CHUNKS_PER_FRAME) {
				chunks[e] = new Chunk(e, chunks);
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
				setupCount++; // total number of chunks loaded THIS FRAME
				self.numChunksSetup++; // total number of chunks loaded IN TOTAL
			}
		});
		
		chunkSetupList = [];
	}
	
	function UpdateChunkRebuildList(self){
		chunkRebuildList.forEach(function (e, i, array){
			e.CreateMesh(shaderProgram, self.Mesher);
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
			self.numChunksSetup--;
		});
		chunkUnloadList = [];
	}
	
	function Render(renderMode){
		for (var i = 0; i < chunkRenderList.length; i++){
			chunkRenderList[i].Render(shaderProgram, renderMode);
		}
		chunkRenderList = [];
	}
	
	function UpdateChunkVisibilityList(self){
		var isSetup;
		var needsRebuild;
		var isVisible;
		var e;
		
		// update chunk coordinate of the current player world coordinate
		var currentChunkCoord = worldCoordsToChunkCoords(self.frustumCam.eye);
		
		if (chunks[currentChunkCoord] == undefined && self.numChunksSetup == 0) {
			chunkLoadList.push(currentChunkCoord);
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
				neighbourChunkCoords[0] = [thisChunkCoord[0]+1,thisChunkCoord[1],thisChunkCoord[2]];
				neighbourChunkCoords[1] = [thisChunkCoord[0]-1,thisChunkCoord[1],thisChunkCoord[2]];
				neighbourChunkCoords[2] = [thisChunkCoord[0],thisChunkCoord[1]+1,thisChunkCoord[2]];
				neighbourChunkCoords[3] = [thisChunkCoord[0],thisChunkCoord[1]-1,thisChunkCoord[2]];
				neighbourChunkCoords[4] = [thisChunkCoord[0],thisChunkCoord[1],thisChunkCoord[2]+1];
				neighbourChunkCoords[5] = [thisChunkCoord[0],thisChunkCoord[1],thisChunkCoord[2]-1];
				
				//else console.log(neighbourChunkCoords.length);
				
				// Load neighbouring chunks if they are close enough
				neighbourChunkCoords.forEach(function (e,i,a) {
					if (chunks[e] == undefined){
						vecToChunk = subtract(currentChunkCoord,e);
						squareDistToChunk = dot(vecToChunk,vecToChunk);
						if(	   squareDistToChunk < CHUNK_LOAD_RADIUS
							&& (i != 3 || (thisChunk.isSetup && !thisChunk.fullChunkFaces[3]))
						){
							chunkLoadList.push(e);
						}
					}
				});
				
				
				isSetup = thisChunk.isSetup;
				needsRebuild = thisChunk.needsRebuild || self.rebuildAll;
				
				
				
				// Check if the chunk should be setup
				/*
					Current strat:					Only setup a chunk if at least one of the neighbour chunks in the direction of player	isSetup and does not have a full chunk face towards the chunk in consideration
					Maybe use less strict stratt?:	Only setup a chunk if at least one of the neighbour chunks 								isSetup and does not have a full chunk face towards the chunk in consideration
				*/
				
				if(!isSetup){
					
					var shouldSetup = false;
					var directionsToCheck = subtract(thisChunkCoord, currentChunkCoord); 										// the directions in which neighbours should be considered
					var nCoord = [thisChunkCoord[0], thisChunkCoord[1], thisChunkCoord[2] ]; 									// variable holding the coordinate of the neighbour that is currently being checked
					for (var i = 0; i < 3; i++){ 																				// iterate over each of the directions to consider
						if (directionsToCheck[i] != 0) { 																		// if this direction is not zero (this occurs if the chunk is axis-aligned with the camera)
							directionsToCheck[i] = directionsToCheck[i]/Math.abs(directionsToCheck[i]);							// get + or - 1 in along the axis we are currently checking
							nCoord[i] -= directionsToCheck[i];																	// add the + or - 1 to the neighbour we are considering
							var faceToCheck = i*2;																				// get the index of the face to check
							if (directionsToCheck[i] < 0) faceToCheck += 1;														// add one if the direction is negative (since the index of the negative direction is 1 higher)
							if (chunks[nCoord] != undefined && chunks[nCoord].isSetup && !chunks[nCoord].fullChunkFaces[faceToCheck]) shouldSetup = true;
																																// if the neighbour chunk is setup, and does not have a full chunk face facing towards the new chunk, setup the new chunk
							nCoord[i] += directionsToCheck[i];																	// set the neighbour coordinate back to be ready for the next axis (i)
						}
					}
					var shouldForceSetup = dot(directionsToCheck, directionsToCheck) < CHUNK_FORCE_SETUP_RADIUS;
					if(shouldSetup || shouldForceSetup) chunkSetupList.push(thisChunk);
					
					
					
					//counter = 0;					// Timer code, for debugging
					//var then = Date.now();
					//var now = Date.now();
					//counter += (now - then);
					
					
				}
				
				
				if(isSetup && needsRebuild) chunkRebuildList.push(thisChunk);
				if(chunks[key].ShouldRender()) chunkRenderList.push(chunks[key]);
			}
		}
	}
	
	function Update(){
		
		UpdateChunkVisibilityList(this);
		UpdateChunkLoadList(this);
		UpdateChunkSetupList(this);
		UpdateChunkRebuildList(this);
		UpdateChunkUnloadList(this);
		
		this.numChunksRendered = chunkRenderList.length;
		
	}
	
	// retrieve block at given position
	function getBlock(pos){
		var chunkCoords = worldCoordsToChunkCoords(pos);
		var chunk = chunks[chunkCoords];
		var internalCoord = vec3(pos[0]-chunkCoords[0]*CHUNK_SIZE, pos[1]-chunkCoords[1]*CHUNK_SIZE, pos[2]-chunkCoords[2]*CHUNK_SIZE);
		if(chunk != undefined) return chunk.voxels[internalCoord[0]][internalCoord[1]][internalCoord[2]];
		return false;
	}
	
	// interface for WorldManager
	return {
		
		getBlock: getBlock,
		rebuildAll: rebuildAll,
		numChunksSetup: numChunksSetup,
		numChunksRendered: numChunksRendered,
		frustumCam : frustumCam,
		Render: Render, 
		Mesher: Mesher,
		Chunk : Chunk,
		Update: Update
		
	}
}


// Chunk object - this is where the magic happens
function Chunk(chunkPosition, chunks){
	
	// reference to other chunks - used for neighbour checking (e.g., to see if this chunk is totally surrounded)
	var chunks = chunks;
	
	// position in chunk coordintes and voxels array
	var chunkPosition = chunkPosition;
	var voxels = [];
	
	// state information variables
	var needsRebuild = true;
	var isSetup = false;
	var isEmpty = true;
	var isSurrounded = true;
	var fullChunkFaces = []; // booleans used to not render completely surrounded chunks
	
	// attribute buffers, buffer locations and buffer 
	var vertexBuffers = new Array();
	var vertexAttrValues = new Array();
	
	// Create the mesher object
	var Mesh = new MeshObject();
	
	function CreateMesh(shaderProgram, Mesher){
		
		// set chunk flag - this chunk was just rebuilt
		this.needsRebuild = false;
		
		// Create the mesh
		Mesh.CreateMesh = Mesher;
		Mesh.CreateMesh(voxels, chunkPosition);
		vertexAttrValues	= Mesh.vertexAttrValues;
		vertexBuffers 		= Mesh.vertexBuffers;
		this.isEmpty 		= Mesh.flags["isEmpty"];
		this.fullChunkFaces = Mesh.flags["fullChunkFaces"];
		
		// transfer the attributes to the GPU
		TransferVertexAttributes(shaderProgram, vertexBuffers, vertexAttrValues);
		
	}
	
	function Render(shaderProgram, mode){
		
		// Enable all the vertex buffers
		for(var i = 0; i < vertexBuffers.length; i++){
			vertexBuffers[i].Enable(shaderProgram);
		}
		
		// Draw the stuff
		gl.drawArrays( mode, 0, vertexAttrValues[0].length );
		
	}
	
	
	function Unload(){
		
		var chunkPosition = null; // coordinates of the chunk offset (vec2)
		var voxels = null;
		
		// information variables
		var needsRebuild = null;
		var isSetup = null;
		var isEmpty = null;
		var fullChunkFaces = null; // booleans used to not render completely surrounded chunks
		
	}
	
	function Setup(){
		
		var x, y, z; // World coordinates of each voxel
		
		// Generate empty voxels throughout the chunk - replace with some more interesting world gen later
		for(var i = 0; i < CHUNK_SIZE; i++) {
			voxels[i] = [];
			for(var j = 0; j < CHUNK_SIZE; j++) {
				voxels[i][j] = [];
				for(var k = 0; k < CHUNK_SIZE; k++) {
					
					
					//voxels[i][j][k] = (Perlin.noise3d(i,j,k) < 0.8) ? BLOCK_TYPES.DEFAULT : BLOCK_TYPES.GRASS; // Cool space world thingy
					
					x = i+chunkPosition[0]*CHUNK_SIZE;
					y = j+chunkPosition[1]*CHUNK_SIZE;
					z = k+chunkPosition[2]*CHUNK_SIZE;
					
					voxels[i][j][k] = (Perlin.noise(x/200,z/200)*50 < y) ? BLOCK_TYPES.DEFAULT : BLOCK_TYPES.GRASS; // Cool valley ish terrain thingy
					
				}
			}
		}
		this.isEmpty = false;
		this.isSetup = true;
		
	}
	
	function ShouldRender(){
		
		// get neighbouring chunks and check if this one is completely surrounded
		var neighbourChunks = [];
		neighbourChunks.push(chunks[[chunkPosition[0]+1,chunkPosition[1],chunkPosition[2]]]);
		neighbourChunks.push(chunks[[chunkPosition[0]-1,chunkPosition[1],chunkPosition[2]]]);
		neighbourChunks.push(chunks[[chunkPosition[0],chunkPosition[1]+1,chunkPosition[2]]]);
		neighbourChunks.push(chunks[[chunkPosition[0],chunkPosition[1]-1,chunkPosition[2]]]);
		neighbourChunks.push(chunks[[chunkPosition[0],chunkPosition[1],chunkPosition[2]+1]]);
		neighbourChunks.push(chunks[[chunkPosition[0],chunkPosition[1],chunkPosition[2]-1]]);
		
		this.isSurrounded = true;
		this.isSurrounded = this.isSurrounded && neighbourChunks[0] != undefined && neighbourChunks[0].fullChunkFaces[1] && !neighbourChunks[0].needsRebuild;
		this.isSurrounded = this.isSurrounded && neighbourChunks[1] != undefined && neighbourChunks[1].fullChunkFaces[0] && !neighbourChunks[1].needsRebuild;
		this.isSurrounded = this.isSurrounded && neighbourChunks[2] != undefined && neighbourChunks[2].fullChunkFaces[3] && !neighbourChunks[2].needsRebuild;
		this.isSurrounded = this.isSurrounded && neighbourChunks[3] != undefined && neighbourChunks[3].fullChunkFaces[2] && !neighbourChunks[3].needsRebuild;
		this.isSurrounded = this.isSurrounded && neighbourChunks[4] != undefined && neighbourChunks[4].fullChunkFaces[5] && !neighbourChunks[4].needsRebuild;
		this.isSurrounded = this.isSurrounded && neighbourChunks[5] != undefined && neighbourChunks[5].fullChunkFaces[4] && !neighbourChunks[5].needsRebuild;
		
		// Do view (frustum) culling here...
		var inView = World.frustumCam.CullSquareTest(chunkCoordsToWorldCoords(chunkPosition), CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE);
		
		return this.isSetup && !this.isEmpty && !this.isSurrounded && inView;
	}
	
	// interface for Chunk
	return {
		chunkPosition,
		voxels : voxels,
		needsRebuild: needsRebuild,
		isSetup: isSetup,
		isEmpty: isEmpty,
		isSurrounded: isSurrounded,
		fullChunkFaces: fullChunkFaces,
		ShouldRender: ShouldRender,
		Render : Render,
		CreateMesh: CreateMesh,
		Unload: Unload,
		Setup: Setup
	}
}

// takes woorld coord and converts it to chunk coords (vec3) - use for indexing the chunks list
function worldCoordsToChunkCoords(pos){
	var result = [];
	result[0] = Math.floor(pos[0]/CHUNK_SIZE);
	result[1] = Math.floor(pos[1]/CHUNK_SIZE);
	result[2] = Math.floor(pos[2]/CHUNK_SIZE);
	return result;
}

// converts chunk coordinates back to world coordinates
function chunkCoordsToWorldCoords(chunkPosition){
	var result = [];
	result[0] = chunkPosition[0]*CHUNK_SIZE;
	result[1] = chunkPosition[1]*CHUNK_SIZE;
	result[2] = chunkPosition[2]*CHUNK_SIZE;
	return result;
}

// "enum" for block types
const BLOCK_TYPES = {
	
	DEFAULT:	"0",
	GRASS:		"1",
	DIRT:		"2",
	WATER:		"3",
	STONE:		"4",
	WOOD:		"5",
	SAND:		"6",
	
}

var BLOCK_INDEX = [];
for (var key in BLOCK_TYPES){
	BLOCK_INDEX.push(BLOCK_TYPES[key]);
}



