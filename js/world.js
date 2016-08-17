
// World namespace
function WorldManager(gl, shaderProgram){
	
	// WebGL context
	var gl = gl;
	var shaderProgram = shaderProgram;
	
	// Chunk management lists
	var chunks = [];				// list of all the chunks
	var chunkLoadList = [];			// list of chunks that are yet to be loaded (delay to improve framerate during loading)
	var chunkSetupList = [];		// list of chunks that are loaded but not setup (set material type, landscape generation, etc.)
	var chunkRebuildList = [];		// list of chunks that changed since last frame (e.g. by picking)
	var chunkUnloadList = [];		// list of chunks that need to be removed
	var chunkVisibilityList = [];	// list of chunks that are currently visible
	var chunkRenderList = [];		// list of chunks that are rendered next frame
	
	const MAX_CHUNKS_PER_FRAME = 10; // the maximum number of chunks to load per frame
	const CHUNK_SIZE = 2;
	
	function UpdateChunkLoadList(){
		for (var i = 0; i < Math.min(MAX_CHUNKS_PER_FRAME, chunkLoadList.length); i++){
			chunkLoadList[i].Load();
		}
		chunkLoadList = [];
	}
	
	function UpdateChunkSetupList(){
		for (var i = 0; i < Math.min(MAX_CHUNKS_PER_FRAME, chunkSetupList.length); i++){
			chunkSetupList[i].Setup();
		}
		chunkSetupList = [];
	}
	
	function UpdateChunkRebuildList(){
		for (var i = 0; i < chunkRebuildList.length; i++){
			chunkRebuildList[i].CreateMesh(shaderProgram);
		}
		chunkRebuildList = [];
	}
	
	function UpdateChunkUnloadList(){
		for (var i = 0; i < chunkUnloadList.length; i++){
			chunkUnloadList[i].Unload();
		}
		chunkUnloadList = [];
	}
	
	function UpdateChunkVisibilityList(){
		
		for (var i = 0; i < chunks.length; i++){
			
			if (true) { // TODO: check for visibility
				chunkVisibilityList.push(chunks[i]); 
			} else if (chunks[i].isLoaded){ // chunk is loaded but no longer visible
				chunkUnloadList.push(chunk[i]);
			}
			
			
		}
		
		for (var i = 0; i < chunkVisibilityList.length; i++){
			if(!chunkVisibilityList[i].isLoaded) chunkLoadList.push(chunkVisibilityList[i]);
			if(chunkVisibilityList[i].isLoaded && !chunkVisibilityList[i].isSetup) chunkSetupList.push(chunkVisibilityList[i]);
			if(chunkVisibilityList[i].needsRebuild) chunkRebuildList.push(chunkVisibilityList[i]);
		}
	}
	
	function UpdateChunkRenderList(){
		chunkRenderList = chunkVisibilityList;
	}
	
	
	function Update(){
		
		gl.useProgram(shaderProgram);
		
		UpdateChunkVisibilityList();
		UpdateChunkLoadList();
		UpdateChunkSetupList();
		UpdateChunkRebuildList();
		UpdateChunkUnloadList();
		UpdateChunkRenderList();
	}
	
	
	// "enum" for block types
	BlockTypes = {
		
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
	
	
	for(var i = 0; i < 2; i++) { // RAISE THIS AND FIGURE OUT WHY IT DOESN'T WORK
		var x,y,z;
		x = i;
		y = i;
		z = i;
		chunks[i] = new Chunk(vec4(CHUNK_SIZE*x,CHUNK_SIZE*y,CHUNK_SIZE*z,0));
	}
	
	function Render(){
		for (var i = 0; i < chunkRenderList.length; i++){
			chunkRenderList[i].Render(shaderProgram);
		}
		
	}
	
	// Chunk object - this is where the magic happens
	function Chunk(chunkPosition){
		
		var chunkPosition; // coordinates of the chunk offset (vec4)
		var blocks = [];
		var needsRebuild = true;
		var isLoaded = false;
		var isSetup = false;
		
		// Create the vertex buffer
		var vBuffer = gl.createBuffer();
		var vPositionLoc;
		var points = [];
		
		// Create the color buffer
		var cBuffer = gl.createBuffer();
		var vColorLoc;
		var colors = [];
		
		
		function CreateMesh(shaderProgram){
			
			this.needsRebuild = false;
			
			for(var i = 0; i < CHUNK_SIZE; i++) {
				for(var j = 0; j < CHUNK_SIZE; j++) {
					for(var k = 0; k < CHUNK_SIZE; k++) {
						if(blocks[i][j][k].active) createCube(vec4(i,j,k,0));
					}
				}
			}
			
			// Create and configure the vertex buffer
			vBuffer = gl.createBuffer();
			gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );
			
			vPositionLoc = gl.getAttribLocation( passProgram, "vPosition" );
			gl.vertexAttribPointer( vPositionLoc, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vPositionLoc );
			
			// Create and configure the color buffer
			cBuffer = gl.createBuffer();
			gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
			
			vColorLoc = gl.getAttribLocation( passProgram, "vColor" );
			gl.vertexAttribPointer( vColorLoc, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vColorLoc );
			
		}
		
		function Render(shaderProgram){
			
			// Re-associate this chunks vertex buffer with the shader program
			gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
			gl.vertexAttribPointer( vPositionLoc, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vPositionLoc );
			
			// Re-associate this chunks color buffer with the shader program
			gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
			gl.vertexAttribPointer( vColorLoc, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vColorLoc );
			
			gl.drawArrays( gl.TRIANGLES, 0, points.length );
		}
		
		function createCube(blockPosition) {
			quad( 1, 0, 3, 2, blockPosition );
			quad( 2, 3, 7, 6, blockPosition );
			quad( 3, 0, 4, 7, blockPosition );
			quad( 6, 5, 1, 2, blockPosition );
			quad( 4, 5, 6, 7, blockPosition );
			quad( 5, 4, 0, 1, blockPosition );
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
			var color = normal;
			color[0] = Math.abs(color[0]);
			color[1] = Math.abs(color[1]);
			color[2] = Math.abs(color[2]);
			color[3] = 1;
			
			for ( var i = 0; i < indices.length; ++i ) {
				points.push( add(add(vertices[indices[i]],chunkPosition), blockPosition) );
				colors.push( color );
			}
		}
		
		function getNormal(p1,p2,p3){
			var result = cross(subtract(p1,p2),subtract(p1,p3))
			result.push(0);
			return result;
		}
		
		function Load(){
			this.isLoaded = true;
			// Generate empty blocks throughout the chunk - replace with some more interesting world gen later
			for(var i = 0; i < CHUNK_SIZE; i++) {
				blocks[i] = [];
				for(var j = 0; j < CHUNK_SIZE; j++) {
					blocks[i][j] = [];
					for(var k = 0; k < CHUNK_SIZE; k++) {
						blocks[i][j][k] = new Block();
						if (i === 0 && j === 0 && k === 0){
							blocks[i][j][k].active = false;
						}
					}
				}
			}
		}
		function Unload(){
			this.isLoaded = false;
			blocks = null;
		}
		function Setup(){ this.isSetup = true; }
		
		// interface for Chunk
		return {
			blocks : blocks,
			needsRebuild: needsRebuild,
			isLoaded: isLoaded,
			isSetup: isSetup,
			Render : Render,
			CreateMesh: CreateMesh,
			Load: Load,
			Unload: Unload,
			Setup: Setup
		}
	}
	
	// interface for WorldManager
	return {
		
		BlockTypes: BlockTypes,
		Block : Block,
		Chunk : Chunk,
		Update: Update,
		Render: Render
		
	}
}

