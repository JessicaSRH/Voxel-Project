
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
	
	// The mesher
	var Mesher = DefaultMesher;
	
	//The voxel generator
	var VoxelGenerator = DefaultVoxelGenerator;
	
	
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
				e.Setup(self.VoxelGenerator);
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
			if(squareDistToChunk > CHUNK_UNLOAD_RADIUS && !chunkUnloadList.includes(thisChunk)){
				chunkUnloadList.push(thisChunk);
			} else {
				
				isSetup = thisChunk.isSetup;
				needsRebuild = thisChunk.needsRebuild || self.rebuildAll;
				
				if(isSetup){ // if this chunk is setup, consider loading more chunks around it
					var neighbourChunkCoords = [];
					neighbourChunkCoords[0] = [thisChunkCoord[0]+1,thisChunkCoord[1],thisChunkCoord[2]];
					neighbourChunkCoords[1] = [thisChunkCoord[0]-1,thisChunkCoord[1],thisChunkCoord[2]];
					neighbourChunkCoords[2] = [thisChunkCoord[0],thisChunkCoord[1]+1,thisChunkCoord[2]];
					neighbourChunkCoords[3] = [thisChunkCoord[0],thisChunkCoord[1]-1,thisChunkCoord[2]];
					neighbourChunkCoords[4] = [thisChunkCoord[0],thisChunkCoord[1],thisChunkCoord[2]+1];
					neighbourChunkCoords[5] = [thisChunkCoord[0],thisChunkCoord[1],thisChunkCoord[2]-1];
					
					// Load neighbouring chunks if they are close enough
					neighbourChunkCoords.forEach(function (e,i,a) {
						if (chunks[e] == undefined){ // if the neighbour is not already loaded
							vecToChunk = subtract(currentChunkCoord,e); // vector points towards players chunk
							squareDistToChunk = dot(vecToChunk,vecToChunk); // compute (squared) distance from player to chunk in consideration
							if (squareDistToChunk < CHUNK_FORCE_LOAD_RADIUS){ chunkLoadList.push(e); } // load the chunk if it is below the force load radius
							else if(squareDistToChunk < CHUNK_LOAD_RADIUS // else check if the chunk is within the general max load radius
									&& (	(i == 0 && isSetup && thisChunk.fullChunkFaces[1] != undefined && !thisChunk.fullChunkFaces[1]) // 
										||	(i == 1 && isSetup && thisChunk.fullChunkFaces[0] != undefined && !thisChunk.fullChunkFaces[0]) // Checks if the chunk faces towards the chunk considered for loading are full -
										||	(i == 2 && isSetup && thisChunk.fullChunkFaces[3] != undefined && !thisChunk.fullChunkFaces[3]) // only load the chunk if at least one face is not full
										||	(i == 3 && isSetup && thisChunk.fullChunkFaces[2] != undefined && !thisChunk.fullChunkFaces[2]) // this saves SO MUCH MEMORY - totally worth it
										||	(i == 4 && isSetup && thisChunk.fullChunkFaces[5] != undefined && !thisChunk.fullChunkFaces[5]) // 
										||	(i == 5 && isSetup && thisChunk.fullChunkFaces[4] != undefined && !thisChunk.fullChunkFaces[4]) // 
									)
									&& ( !thisChunk.isEmpty ) // Don't load empty chunks in the air - WARNING: This prevents floating islands with 1 or more empty chunks between already-loaded terrain! REALLY good for memory though... - halves number of loaded chunks
							){
								chunkLoadList.push(e); // add the coordinates for loading if the test is passed
							}
						}
					});
				}
				
				if(!isSetup)chunkSetupList.push(thisChunk);
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
	
	// retrieve voxel at given position
	function getVoxel(pos){
		var chunkCoords = worldCoordsToChunkCoords(pos);
		var chunk = chunks[chunkCoords];
		var internalCoord = vec3(pos[0]-chunkCoords[0]*CHUNK_SIZE, pos[1]-chunkCoords[1]*CHUNK_SIZE, pos[2]-chunkCoords[2]*CHUNK_SIZE);
		if(chunk != undefined) return chunk.voxels[internalCoord[0]][internalCoord[1]][internalCoord[2]];
		return false;
	}
	
	// interface for WorldManager
	return {
		
		getVoxel: getVoxel,
		rebuildAll: rebuildAll,
		numChunksSetup: numChunksSetup,
		numChunksRendered: numChunksRendered,
		frustumCam : frustumCam,
		Render: Render, 
		Mesher: Mesher,
		VoxelGenerator: VoxelGenerator,
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
		
		
		counter = 0;
		var then = Date.now();
		Mesh.CreateMesh(voxels, chunkPosition);
		var now = Date.now();
		counter += now-then;
		console.log("Total time spent on mesh creation: " + counter);
		
		
		
		vertexAttrValues	= Mesh.vertexAttrValues;
		vertexBuffers 		= Mesh.vertexBuffers;
		
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
		
		this.chunkPosition = null; // coordinates of the chunk offset (vec2)
		this.voxels = null;
		
		// information variables
		this.needsRebuild = null;
		this.isSetup = null;
		this.isEmpty = null;
		this.fullChunkFaces = null; // booleans used to not render completely surrounded chunks
		
	}
	
	function Setup(VoxelGenerator){
		
		// Get chunk coord in world coordinates
		var chunkWorldCoords = chunkCoordsToWorldCoords(chunkPosition);
		
		// initiate relevant chunk flags
		this.isEmpty = true;
		this.needsRebuild = false;
		this.fullChunkFaces = [true, true, true, true, true, true];
		this.isSetup = true;
		
		// used for setting the fullChunkFaces flag correctly below
		var checkForFullChunkFace = [false, false, false, false, false, false];
	
		// Generate empty voxels throughout the chunk - replace with some more interesting world gen later
		for(var i = 0; i < CHUNK_SIZE; i++) {
			voxels[i] = [];
			
			if (i == 0) checkForFullChunkFace[0] = true;
			else checkForFullChunkFace[0] = false;
			if (i == CHUNK_SIZE-1) checkForFullChunkFace[1] = true;
			else checkForFullChunkFace[1] = false;
			
			for(var j = 0; j < CHUNK_SIZE; j++) {
				voxels[i][j] = [];
				
				if (j == 0)	checkForFullChunkFace[2] = true;
				else checkForFullChunkFace[2] = false;
				if (j == CHUNK_SIZE-1) checkForFullChunkFace[3] = true;
				else checkForFullChunkFace[3] = false;
				
				for(var k = 0; k < CHUNK_SIZE; k++) {
					
					if (k == 0) checkForFullChunkFace[4] = true;
					else checkForFullChunkFace[4] = false;
					if (k == CHUNK_SIZE-1) checkForFullChunkFace[5] = true;
					else checkForFullChunkFace[5] = false;
					
					voxels[i][j][k] = VoxelGenerator(i+chunkWorldCoords[0], j+chunkWorldCoords[1], k+chunkWorldCoords[2]);
					
					// set flags
					if (voxels[i][j][k] != VOXEL_TYPES.DEFAULT) {
						this.isEmpty = false;
						this.needsRebuild = true;
					} else {
						// set flag indicating if the chunk face is full (used to chunk loading)
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
		
		return this.isSetup && inView && !this.isEmpty && !this.isSurrounded;
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
	return [Math.floor(pos[0]/CHUNK_SIZE), Math.floor(pos[1]/CHUNK_SIZE), Math.floor(pos[2]/CHUNK_SIZE)];
}

// converts chunk coordinates back to world coordinates
function chunkCoordsToWorldCoords(chunkPosition){
	return [chunkPosition[0]*CHUNK_SIZE, chunkPosition[1]*CHUNK_SIZE, chunkPosition[2]*CHUNK_SIZE];
}

