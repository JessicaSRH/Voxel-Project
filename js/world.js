"use strict"


///TODO:
/*

Check blocks in neighbouring chunks during mesh creation!
Triangle face merging; make one big triangle when a possible
Frustum culling
Perlin noise aka. landscape generation

*/



// World namespace
function WorldManager(gl, shaderProgram){
	
	// Debugging counter
	var counter = 0;
	
	// WebGL context
	var gl = gl;
	var shaderProgram = shaderProgram;
	var renderMode = gl.LINES;
	
	// Chunk management lists
	var chunks = {};				// list of all the chunks
	var chunkLoadList = [];			// list of chunks that are yet to be loaded (delay to improve framerate during loading)
	var chunkSetupList = [];		// list of chunks that are loaded but not setup (set material type, landscape generation, etc.)
	var chunkRebuildList = [];		// list of chunks that changed since last frame (e.g. by picking)
	var chunkUnloadList = [];		// list of chunks that need to be removed
	var chunkRenderList = [];		// list of chunks that are rendered next frame
	
	function UpdateChunkLoadList(){
		var loadCount = 0;
		chunkLoadList.forEach(function (e, i, array){
			if (loadCount < MAX_CHUNKS_PER_FRAME) {
				e.Load();
				loadCount++;
			}
		});
		chunkLoadList = [];
	}
	
	function UpdateChunkSetupList(){
		var setupCount = 0;
		chunkSetupList.forEach(function (e, i, array){
			if(setupCount < MAX_CHUNKS_PER_FRAME){
				e.Setup();
				setupCount++;
			}
		});
		chunkSetupList = [];
	}
	
	function UpdateChunkRebuildList(){
		chunkRebuildList.forEach(function (e, i, array){
			e.CreateMesh(shaderProgram);
		});
		chunkRebuildList = [];
	}
	
	function UpdateChunkUnloadList(){
		chunkUnloadList.forEach(function (e, i, array){
			e.Unload();
		});
		chunkUnloadList = [];
	}
	
	function UpdateChunkRenderList(){
		
		chunkRenderList = [];
		
		for(var key in chunks){
			if(getChunk(key).ShouldRender()){
				chunkRenderList.push(getChunk(key));
			}
		}
	}
	
	function UpdateChunkVisibilityList(){
		var isLoaded;
		var isSetup;
		var needsRebuild;
		var isVisible;
		var e;
		
		// update chunk coordinate of the current player world coordinate
		var currentChunkCoord = worldCoordsToChunkCoords(Controls.eye);
		
		if (getChunk(currentChunkCoord) == undefined) {
			addChunk(currentChunkCoord);
		}
		
		forEachChunk(function(thisChunk,key,chunks){
			// Get this chunks coordinates and the neighbouring chunk coordinates
			var thisChunkCoord = thisChunk.chunkPosition;
			
			var vecToChunk;
			var squareDistToChunk;
			
			// Unload chunk if it is too far away
			vecToChunk = subtract(currentChunkCoord,thisChunkCoord);
			squareDistToChunk = dot(vecToChunk,vecToChunk);
			if(squareDistToChunk > CHUNK_UNLOAD_RADIUS){
				chunkUnloadList.push(thisChunk);
				delChunk(key);
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
					if (getChunk(e) == undefined){
						vecToChunk = subtract(currentChunkCoord,e);
						squareDistToChunk = dot(vecToChunk,vecToChunk);
						if(squareDistToChunk < CHUNK_LOAD_RADIUS){
							addChunk(e);
						}
					}
				});
				
				
				isLoaded = thisChunk.isLoaded;
				isSetup = thisChunk.isSetup;
				needsRebuild = thisChunk.needsRebuild;
				
				if(!isLoaded) chunkLoadList.push(thisChunk);
				if(!isSetup) chunkSetupList.push(thisChunk);
				if(isLoaded && isSetup && needsRebuild) chunkRebuildList.push(thisChunk);
			}
		});
	}
	
	function Update(){
		UpdateChunkVisibilityList();
		UpdateChunkLoadList();
		UpdateChunkSetupList();
		UpdateChunkRebuildList();
		UpdateChunkUnloadList();
		UpdateChunkRenderList();
		
	}
	
	// takes woorld coord (vec3 or vec4) and converts it to chunk coords (vec3) use for indexing the chunks list
	function worldCoordsToChunkCoords(pos){
		var result = vec3();
		result[0] = Math.floor(pos[0]/CHUNK_SIZE);
		result[1] = Math.floor(pos[1]/CHUNK_SIZE);
		result[2] = Math.floor(pos[2]/CHUNK_SIZE);
		return result;
	}
	
	// retrieve block at given position
	function getBlock(pos){
		var chunkCoords = worldCoordsToChunkCoords(pos);
		var chunk = getChunk(chunkCoords);
		var internalCoord = vec3(pos[0]-chunkCoords[0]*CHUNK_SIZE, pos[1]-chunkCoords[1]*CHUNK_SIZE, pos[2]-chunkCoords[2]*CHUNK_SIZE);
		if(chunk != undefined && chunk.isLoaded) return chunk.blocks[internalCoord[0]][internalCoord[1]][internalCoord[2]];
		return false;
	}
	
	// function for accessing chunks
	function getChunk(key){
		return chunks[key];
	}
	
	// function for adding new chunk
	function addChunk(key, chunk){
		chunks[key] = new Chunk(key);
	}
	
	function delChunk(key){
		chunks[key] = null;
		delete(chunks[key]);
	}
	
	// function for iterating over all chunks
	function forEachChunk(callback){
		for(var key in chunks){
			callback(chunks[key], key, chunks);
		}
	}
	
	function Render(shaderProgram, mode){
		for (var i = 0; i < chunkRenderList.length; i++){
			chunkRenderList[i].Render(shaderProgram, mode);
		}
		
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
			//console.log(counter);
		
			this.needsRebuild = false;
			
			// reset vertex buffer arrays
			points = [];
			colors = [];
			normals = [];
			
			var checkForFullChunkFace = [false, false, false, false, false, false];
			
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
						
						//var then = Date.now();
						//var now = Date.now();
						//counter += (now - then);
						
						// is the block empty?
						if (blocks[i][j][k] != BlockTypes.BlockType_Default){
							// boolean array used for culling faces; index order is:
							// +x, -x, +y, -y, +z, -z
							var shouldDraw = [];
							
							// check if the block has neighbours
							shouldDraw[0] = (i+1 >= CHUNK_SIZE	|| blocks[i+1][j][k] == BlockTypes.BlockType_Default);
							shouldDraw[1] = (i-1 < 0			|| blocks[i-1][j][k] == BlockTypes.BlockType_Default);
							shouldDraw[2] = (j+1 >= CHUNK_SIZE	|| blocks[i][j+1][k] == BlockTypes.BlockType_Default);
							shouldDraw[3] = (j-1 < 0			|| blocks[i][j-1][k] == BlockTypes.BlockType_Default);
							shouldDraw[4] = (k+1 >= CHUNK_SIZE	|| blocks[i][j][k+1] == BlockTypes.BlockType_Default);
							shouldDraw[5] = (k-1 < 0			|| blocks[i][j][k-1] == BlockTypes.BlockType_Default);
							
							createCube([i,j,k], shouldDraw);
							
						} else {
							// set flag indicating if the chunk face is fullChunkFaces
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
			vBuffer = gl.createBuffer();
			gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );
			
			vPositionLoc = gl.getAttribLocation( shaderProgram, "vPosition" );
			gl.vertexAttribPointer( vPositionLoc, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vPositionLoc );
			
			// Create and configure the color buffer
			cBuffer = gl.createBuffer();
			gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
			
			vColorLoc = gl.getAttribLocation( shaderProgram, "vColor" );
			gl.vertexAttribPointer( vColorLoc, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vColorLoc );
			
			// Create and configure the color buffer
			nBuffer = gl.createBuffer();
			gl.bindBuffer( gl.ARRAY_BUFFER, nBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW );
			
			vNormalLoc = gl.getAttribLocation( shaderProgram, "vNormal" );
			gl.vertexAttribPointer( vNormalLoc, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vNormalLoc );
			
		}
		
		function Render(shaderProgram, mode){
			
			if (this.isEmpty) return false;
			
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
		}
		
		function Unload(){
			this.isLoaded = false;
			blocks = [];
			delChunk(chunkPosition);
		}
		
		function Setup(){
			// Generate empty blocks throughout the chunk - replace with some more interesting world gen later
			for(var i = 0; i < CHUNK_SIZE; i++) {
				blocks[i] = [];
				for(var j = 0; j < CHUNK_SIZE; j++) {
					blocks[i][j] = [];
					for(var k = 0; k < CHUNK_SIZE; k++) {
						blocks[i][j][k] = BlockTypes.BlockType_Grass;
						/*if(
							i == 0
						||	j == 0
						||	k == 0
						||	i == CHUNK_SIZE-1
						||	j == CHUNK_SIZE-1
						||	k == CHUNK_SIZE-1
						){
							blocks[i][j][k] = BlockTypes.BlockType_Default;
						}*/
					}
				}
			}
			this.isEmpty = false;
			this.isSetup = true;
		}
		
		function ShouldRender(){
			
			var neighbourChunks = [];
			neighbourChunks.push(getChunk([chunkPosition[0]+1,chunkPosition[1],chunkPosition[2]]));
			neighbourChunks.push(getChunk([chunkPosition[0]-1,chunkPosition[1],chunkPosition[2]]));
			neighbourChunks.push(getChunk([chunkPosition[0],chunkPosition[1]+1,chunkPosition[2]]));
			neighbourChunks.push(getChunk([chunkPosition[0],chunkPosition[1]-1,chunkPosition[2]]));
			neighbourChunks.push(getChunk([chunkPosition[0],chunkPosition[1],chunkPosition[2]+1]));
			neighbourChunks.push(getChunk([chunkPosition[0],chunkPosition[1],chunkPosition[2]-1]));
			
			var shouldRender = this.isSetup && this.isLoaded && !this.isEmpty;
			var isSurrounded = true;
			
			isSurrounded = isSurrounded && neighbourChunks[0] != undefined && neighbourChunks[0].fullChunkFaces[1];
			isSurrounded = isSurrounded && neighbourChunks[1] != undefined && neighbourChunks[1].fullChunkFaces[0];
			isSurrounded = isSurrounded && neighbourChunks[2] != undefined && neighbourChunks[2].fullChunkFaces[3];
			isSurrounded = isSurrounded && neighbourChunks[3] != undefined && neighbourChunks[3].fullChunkFaces[2];
			isSurrounded = isSurrounded && neighbourChunks[4] != undefined && neighbourChunks[4].fullChunkFaces[5];
			isSurrounded = isSurrounded && neighbourChunks[5] != undefined && neighbourChunks[5].fullChunkFaces[4];
			
			shouldRender = shouldRender && !isSurrounded;
			
			return shouldRender;
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
		Chunk : Chunk,
		Update: Update,
		Render: Render
		
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
	var BlockTypes = {
		
		BlockType_Default:	"0",
		BlockType_Grass:	"1",
		BlockType_Dirt:		"2",
		BlockType_Water:	"3",
		BlockType_Stone:	"4",
		BlockType_Wood:		"5",
		BlockType_Sand:		"6",
		
		numTypes:	7,
		
	}