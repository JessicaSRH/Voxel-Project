"use strict"


// World namespace
function WorldManager(gl, shaderProgram){
	
	// WebGL context
	var gl = gl;
	var shaderProgram = shaderProgram;
	var renderMode = gl.LINES;
	
	// Chunk management lists
	var chunks = [];				// list of all the chunks (visibility list)
	var chunkLoadList = [];			// list of chunks that are yet to be loaded (delay to improve framerate during loading)
	var chunkSetupList = [];		// list of chunks that are loaded but not setup (set material type, landscape generation, etc.)
	var chunkRebuildList = [];		// list of chunks that changed since last frame (e.g. by picking)
	var chunkUnloadList = [];		// list of chunks that need to be removed
	var chunkRenderList = [];		// list of chunks that are rendered next frame
	
	var x_chunk_offset = Math.floor(Controls.eye[0]/CHUNK_SIZE) - Math.floor(NUM_CHUNKS_X/2) - (1/2);
	var z_chunk_offset = Math.floor(Controls.eye[2]/CHUNK_SIZE) - Math.floor(NUM_CHUNKS_Z/2) - (1/2);
	
	var previousChunkCoord = worldCoordsToChunkCoords(Controls.eye);
	var currentChunkCoord = worldCoordsToChunkCoords(Controls.eye);
	
	// initiate empty 2d chunks array
	for(var x = 0; x < NUM_CHUNKS_X; x++) {
		chunks[x] = [];
	}
	
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
		var e;
		
		for(var x = 0; x < NUM_CHUNKS_X; x++) {
			for(var z = 0; z < NUM_CHUNKS_Z; z++) {
				e = chunks[x][z];
				chunkRenderList.push(e);
			}
		}
	}
	
	function UpdateChunkVisibilityList(){
		
		x_chunk_offset = Math.floor(Controls.eye[0]/CHUNK_SIZE) - Math.floor(NUM_CHUNKS_X/2);
		z_chunk_offset = Math.floor(Controls.eye[2]/CHUNK_SIZE) - Math.floor(NUM_CHUNKS_Z/2);
		
		var isLoaded;
		var isSetup;
		var needsRebuild;
		var isVisible;
		var e;
		
		for(var x = 0; x < NUM_CHUNKS_X; x++) {
			for(var z = 0; z < NUM_CHUNKS_Z; z++) {
				e = chunks[x][z];
				if (e == undefined) chunks[x][z] =  new Chunk(vec2(CHUNK_SIZE*(x+x_chunk_offset),CHUNK_SIZE*(z+z_chunk_offset)));
				e = chunks[x][z];
				isLoaded = e.isLoaded;
				isSetup = e.isSetup;
				needsRebuild = e.needsRebuild;
				
				if(!isLoaded) chunkLoadList.push(e);
				if(!isSetup) chunkSetupList.push(e);
				if(isLoaded && isSetup && needsRebuild) chunkRebuildList.push(e);
			}
		}
		
	}
	
	function Update(){
		
		// update chunk coordinate of the current player world coordinate
		currentChunkCoord = worldCoordsToChunkCoords(Controls.eye);
		
		
		// TODO: shift chunks array and create new chunks in freed places
		// like, omg...
		if ( currentChunkCoord[0] != previousChunkCoord[0] ){
			console.log("crossed chunk border; x");
		}
		
		// update chunk coordinate of the previous player world coordinate
		previousChunkCoord = worldCoordsToChunkCoords(Controls.eye);
		
		UpdateChunkVisibilityList();
		UpdateChunkLoadList();
		UpdateChunkSetupList();
		UpdateChunkRebuildList();
		UpdateChunkUnloadList();
		UpdateChunkRenderList();
		
	}
	
	function worldCoordsToChunkCoords(pos){
		var result = vec4();
		result[0] = Math.floor(pos[0]/CHUNK_SIZE);
		result[1] = Math.floor(pos[1]/CHUNK_SIZE);
		result[2] = Math.floor(pos[2]/CHUNK_SIZE);
		result[3] = 1.0;
		return result;
	}
	
	// "enum" for block types
	var BlockTypes = {
		
		BlockType_Default:	0,
		BlockType_Grass:	1,
		BlockType_Dirt:		2,
		BlockType_Water:	3,
		BlockType_Stone:	4,
		BlockType_Wood:		5,
		BlockType_Sand:		6,
		
		BlockType_NumTypes:	7,
		
	}
	
	// Block object
	function Block() {
		// Interface for block
		return {
			active : true,
			blockType : BlockTypes.BlockType_Default
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
		var needsRebuild = true;
		var isLoaded = false;
		var isSetup = false;
		var isEmpty = true;
		
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
			
			for(var i = 0; i < CHUNK_SIZE; i++) {
				for(var j = 0; j < CHUNK_HEIGHT; j++) {
					for(var k = 0; k < CHUNK_SIZE; k++) {
						
						// booleans indicating if there is an active neighbour in that direction
						// used to prevent rendering of hidden faces
						var nXPos = false;
						if( i < CHUNK_SIZE-1 && blocks[i+1][j][k].active) nXPos = true;
						var nXNeg = false;
						if( i >  0 && blocks[i-1][j][k].active) nXNeg = true;
						var nYPos = false;
						if( j < CHUNK_HEIGHT-1 && blocks[i][j+1][k].active) nYPos = true;
						var nYNeg = false;
						if( j >  0 && blocks[i][j-1][k].active) nYNeg = true;
						var nZPos = false;
						if( k < CHUNK_SIZE-1 && blocks[i][j][k+1].active) nZPos = true;
						var nZNeg = false;
						if( k >  0 && blocks[i][j][k-1].active) nZNeg = true;
						
						if(blocks[i][j][k].active) createCube(vec4(i,j,k,0), nXPos, nXNeg, nYPos, nYNeg, nZPos, nZNeg);
					}
				}
			}
			
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
		
		function createCube(blockPosition, nXPos, nXNeg, nYPos, nYNeg, nZPos, nZNeg) {
			if (!nZPos) quad( 1, 0, 3, 2, blockPosition ); // negative z face
			if (!nXPos) quad( 2, 3, 7, 6, blockPosition ); // positive x face
			if (!nYNeg) quad( 3, 0, 4, 7, blockPosition ); // negative y face
			if (!nYPos) quad( 6, 5, 1, 2, blockPosition ); // positive y face
			if (!nZNeg) quad( 4, 5, 6, 7, blockPosition ); // positive z face
			if (!nXNeg) quad( 5, 4, 0, 1, blockPosition ); // negative x face
		}
		
		function quad(a, b, c, d, blockPosition) {
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
			
			var indices = [ a, b, c, a, c, d ];
			
			var normal = getNormal(vertices[a],vertices[b],vertices[c]);
			var color = vec4(0,0,0,1);
			
			/*
			// Color the faces according to their normals
			color[0] = Math.abs(normal[0]);
			color[1] = Math.abs(normal[1]);
			color[2] = Math.abs(normal[2]);
			color[3] = 1;
			
			// Color the faces according to the chunk position
			color[0] = Math.abs(chunkPosition[0])/20;
			color[1] = Math.abs(chunkPosition[1])/20;
			color[2] = Math.abs(chunkPosition[2])/20;
			color[3] = 1;*/
			
			for ( var i = 0; i < indices.length; ++i ) {
				points.push( add(add(vertices[indices[i]],vec4(chunkPosition[0],0,chunkPosition[1],0)), blockPosition) );
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
			// Generate empty blocks throughout the chunk - replace with some more interesting world gen later
			for(var i = 0; i < CHUNK_SIZE; i++) {
				blocks[i] = [];
				for(var j = 0; j < CHUNK_HEIGHT; j++) {
					blocks[i][j] = [];
					for(var k = 0; k < CHUNK_SIZE; k++) {
						blocks[i][j][k] = new Block();
						if (i === 0 && j === 0 && k === 0){
							blocks[i][j][k].active = false;
						}
						this.isEmpty = false;
					}
				}
			}
		}
		function Unload(){
			this.isLoaded = false;
			blocks = [];
		}
		function Setup(){
			this.isSetup = true;
			// World gen here ?
		}
		
		// interface for Chunk
		return {
			chunkPosition,
			blocks : blocks,
			needsRebuild: needsRebuild,
			isLoaded: isLoaded,
			isSetup: isSetup,
			isEmpty: isEmpty,
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
		BlockTypes: BlockTypes,
		Block : Block,
		Chunk : Chunk,
		Update: Update,
		Render: Render
		
	}
}

