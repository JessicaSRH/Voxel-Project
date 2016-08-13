
// World namespace
function WorldManager(gl){
	
	// WebGL context
	var gl = gl;
	
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
	
	// Chunk object - this is where the magic happens
	function Chunk(chunkPosition){
		
		var chunkPosition; // coordinates of the chunk offset (vec4)
		const CHUNK_SIZE = 4;
		var blocks = [];
		
		// Generate empty blocks throughout the chunk
		for(var i = 0; i < CHUNK_SIZE; i++) {
			blocks[i] = [];
			for(var j = 0; j < CHUNK_SIZE; j++) {
				blocks[i][j] = [];
				for(var k = 0; k < CHUNK_SIZE; k++) {
					blocks[i][j][k] = new Block();
				}
			}
		}
		
		// Create the vertex buffer
		var vBuffer = gl.createBuffer();
		var points = [];
		
		// Create the color buffer
		var cBuffer = gl.createBuffer();
		var colors = [];
		
		function CreateMesh(shaderProgram){
			
			for(var i = 0; i < CHUNK_SIZE; i++) {
				for(var j = 0; j < CHUNK_SIZE; j++) {
					for(var k = 0; k < CHUNK_SIZE; k++) {
						if(blocks[i][j][k].active) createCube(vec4(i,j,k,0));
					}
				}
			}
			
			// Bind the shader program
			gl.useProgram( shaderProgram );
			
			// Create and configure the vertex buffer
			var vBuffer = gl.createBuffer();
			gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );
			
			var vPosition = gl.getAttribLocation( passProgram, "vPosition" );
			gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vPosition );
			
			// Create and configure the color buffer
			var cBuffer = gl.createBuffer();
			gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
			gl.bufferData( gl.ARRAY_BUFFER, flatten(colors), gl.STATIC_DRAW );
			
			var vColor = gl.getAttribLocation( passProgram, "vColor" );
			gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
			gl.enableVertexAttribArray( vColor );
			
		}
		
		
		function Render(shaderProgram){
			gl.drawArrays( gl.TRIANGLES, 0, points.length );
		}
		
		function Update(dt){}
		
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
		
		
		
		// interface for Chunk
		return {
			blocks : blocks,
			Render : Render,
			CreateMesh: CreateMesh,
			Update : Update
		}
	}
	
	// interface for WorldManager
	return {
		
		BlockTypes: BlockTypes,
		Block : Block,
		Chunk : Chunk
		
	}
}

