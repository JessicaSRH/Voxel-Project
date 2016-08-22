
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
	
	// Debugging var isInFrustum = true;
	var counter = 0;
	
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
	var numChunks;					// public property giving the number of chunks loaded
	
	// frustum camera
	var frustumCam = fCam;
	
	var Mesher = DefaultMesher;
	
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
		var isLoaded;
		var isSetup;
		var needsRebuild;
		var isVisible;
		var e;
		
		// update chunk coordinate of the current player world coordinate
		var currentChunkCoord = worldCoordsToChunkCoords(Camera.eye);
		
		if (chunks[currentChunkCoord] == undefined) {
			chunks[currentChunkCoord] = new Chunk(currentChunkCoord, chunks);
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
							chunks[e] = new Chunk(e, chunks);
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
		this.numChunks = Object.keys(chunks).length;
		
	}
	
	// retrieve block at given position
	function getBlock(pos){
		var chunkCoords = worldCoordsToChunkCoords(pos);
		var chunk = chunks[chunkCoords];
		var internalCoord = vec3(pos[0]-chunkCoords[0]*CHUNK_SIZE, pos[1]-chunkCoords[1]*CHUNK_SIZE, pos[2]-chunkCoords[2]*CHUNK_SIZE);
		if(chunk != undefined && chunk.isLoaded) return chunk.voxels[internalCoord[0]][internalCoord[1]][internalCoord[2]];
		return false;
	}
	
	// interface for WorldManager
	return {
		
		getBlock: getBlock,
		rebuildAll: rebuildAll,
		numChunks: numChunks,
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
	var isLoaded = false;
	var isSetup = false;
	var isEmpty = true;
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
	
	
	function Load(){
		this.isLoaded = true;
		
		// initialize block array
		var voxels = [];
		
		// information variables
		var needsRebuild = true;
		var isLoaded = false;
		var isSetup = false;
		var isEmpty = true;
		var fullChunkFaces = [true, true, true, true, true, true]; // booleans used to not render completely surrounded chunks
		
	}
	
	function Unload(){
		this.isLoaded = false;
		
		var chunkPosition = null; // coordinates of the chunk offset (vec2)
		var voxels = null;
		
		// information variables
		var needsRebuild = null;
		var isLoaded = null;
		var isSetup = null;
		var isEmpty = null;
		var fullChunkFaces = null; // booleans used to not render completely surrounded chunks
		
	}
	
	function Setup(){
		
		// Generate empty voxels throughout the chunk - replace with some more interesting world gen later
		for(var i = 0; i < CHUNK_SIZE; i++) {
			voxels[i] = [];
			for(var j = 0; j < CHUNK_SIZE; j++) {
				voxels[i][j] = [];
				for(var k = 0; k < CHUNK_SIZE; k++) {
					voxels[i][j][k] = BLOCK_TYPES.GRASS;
					/*if(
						i == 0
					||	j == 0
					||	k == 0
					||	i == CHUNK_SIZE-1
					||	j == CHUNK_SIZE-1
					||	k == CHUNK_SIZE-1
					){
						voxels[i][j][k] = BLOCK_TYPES.DEFAULT;
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
		
		// Do view (frustum) culling here...
		var inView = World.frustumCam.CullSquareTest(chunkCoordsToWorldCoords(chunkPosition), CHUNK_SIZE, CHUNK_SIZE, CHUNK_SIZE);
		
		return this.isSetup && this.isLoaded && !this.isEmpty && !isSurrounded && inView;
	}
	
	// interface for Chunk
	return {
		chunkPosition,
		voxels : voxels,
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
var BLOCK_TYPES = {
	
	DEFAULT:	"0",
	GRASS:		"1",
	DIRT:		"2",
	WATER:		"3",
	STONE:		"4",
	WOOD:		"5",
	SAND:		"6",
	
}


