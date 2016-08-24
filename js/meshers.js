
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


// Mesh object
function MeshObject(){
	
	var vertexBuffers= new Array();
	var vertexAttrValues = new Array();
	var flags = {};
	
	var CreateMesh = DefaultMesher;
	
	return {
		
		vertexBuffers: vertexBuffers,
		vertexAttrValues: vertexAttrValues,
		flags: flags,
		
		CreateMesh: CreateMesh
		
	}
	
}


// Default mesher function
var DefaultMesher = function (voxels, chunkPosition){
	
	// reset vertex buffer arrays
	var points = [];
	var colors = [];
	var normals = [];
	
	var checkForFullChunkFace = [false, false, false, false, false, false];
	this.flags["fullChunkFaces"] = [true, true, true, true, true, true];
	
	// used to check voxels in neighbouring chunks
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
				if (voxels[i][j][k] != VOXEL_TYPES.DEFAULT){
					// boolean array used for culling faces; index order is:
					// +x, -x, +y, -y, +z, -z
					var shouldDraw = [];
					
					// check if the block has neighbours within chunk
					shouldDraw[0] = (i+1 >= CHUNK_SIZE	|| voxels[i+1][j][k] == VOXEL_TYPES.DEFAULT);
					shouldDraw[1] = (i-1 < 0			|| voxels[i-1][j][k] == VOXEL_TYPES.DEFAULT);
					shouldDraw[2] = (j+1 >= CHUNK_SIZE	|| voxels[i][j+1][k] == VOXEL_TYPES.DEFAULT);
					shouldDraw[3] = (j-1 < 0			|| voxels[i][j-1][k] == VOXEL_TYPES.DEFAULT);
					shouldDraw[4] = (k+1 >= CHUNK_SIZE	|| voxels[i][j][k+1] == VOXEL_TYPES.DEFAULT);
					shouldDraw[5] = (k-1 < 0			|| voxels[i][j][k-1] == VOXEL_TYPES.DEFAULT);
					
					//check if voxels at the border have neighbours in neighbouring chunks
					//if (neighbourChunks[0] != undefined && neighbourChunks[0].isLoaded && neighbourChunks[0].isSetup && shouldDraw[0] && i+1 >= CHUNK_SIZE) shouldDraw[0] = neighbourChunks[0].voxels[0][j][k] 				== VOXEL_TYPES.DEFAULT;
					//if (neighbourChunks[1] != undefined && neighbourChunks[1].isLoaded && neighbourChunks[1].isSetup && shouldDraw[1] && i-1 < 0) 			shouldDraw[1] = neighbourChunks[1].voxels[CHUNK_SIZE-1][j][k]	== VOXEL_TYPES.DEFAULT;
					//if (neighbourChunks[2] != undefined && neighbourChunks[2].isLoaded && neighbourChunks[2].isSetup && shouldDraw[2] && j+1 >= CHUNK_SIZE) shouldDraw[2] = neighbourChunks[2].voxels[i][0][k] 				== VOXEL_TYPES.DEFAULT;
					//if (neighbourChunks[3] != undefined && neighbourChunks[3].isLoaded && neighbourChunks[3].isSetup && shouldDraw[3] && j-1 < 0) 			shouldDraw[3] = neighbourChunks[3].voxels[i][CHUNK_SIZE-1][k]	== VOXEL_TYPES.DEFAULT;
					//if (neighbourChunks[4] != undefined && neighbourChunks[4].isLoaded && neighbourChunks[4].isSetup && shouldDraw[4] && k+1 >= CHUNK_SIZE) shouldDraw[4] = neighbourChunks[4].voxels[i][j][0] 				== VOXEL_TYPES.DEFAULT;
					//if (neighbourChunks[5] != undefined && neighbourChunks[5].isLoaded && neighbourChunks[5].isSetup && shouldDraw[5] && k-1 < 0) 			shouldDraw[5] = neighbourChunks[5].voxels[i][j][CHUNK_SIZE-1]	== VOXEL_TYPES.DEFAULT;
					
					
					createCube([i,j,k], shouldDraw);
					
				} else {
					
					// set flag indicating if the chunk face is full
					if (checkForFullChunkFace[0]) this.flags["fullChunkFaces"][0] = false;
					if (checkForFullChunkFace[1]) this.flags["fullChunkFaces"][1] = false;
					if (checkForFullChunkFace[2]) this.flags["fullChunkFaces"][2] = false;
					if (checkForFullChunkFace[3]) this.flags["fullChunkFaces"][3] = false;
					if (checkForFullChunkFace[4]) this.flags["fullChunkFaces"][4] = false;
					if (checkForFullChunkFace[5]) this.flags["fullChunkFaces"][5] = false;
					
				}
			}
		}
	}
	
	// Check if we created any voxels
	this.flags["isEmpty"] = points.length == 0;
	
	
	function createCube(blockPosition, shouldDraw) {
		if (shouldDraw[0]) cubeFace( 2, 3, 7, 6, blockPosition, [ 1.0,  0.0,  0.0, 0.0] ); // positive x face
		if (shouldDraw[1]) cubeFace( 5, 4, 0, 1, blockPosition, [-1.0,  0.0,  0.0, 0.0] ); // negative x face
		if (shouldDraw[2]) cubeFace( 6, 5, 1, 2, blockPosition, [ 0.0,  1.0,  0.0, 0.0] ); // positive y face
		if (shouldDraw[3]) cubeFace( 3, 0, 4, 7, blockPosition, [ 0.0, -1.0,  0.0, 0.0] ); // negative y face
		if (shouldDraw[4]) cubeFace( 1, 0, 3, 2, blockPosition, [ 0.0,  0.0,  1.0, 0.0] ); // positive z face
		if (shouldDraw[5]) cubeFace( 4, 5, 6, 7, blockPosition, [ 0.0,  0.0, -1.0, 0.0] ); // negative z face
	}
	
	function cubeFace(a, b, c, d, blockPosition, normal) {
		
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
	
	// set the vertex buffers and vertex attributes
	this.vertexBuffers.push(new vertextAttributeObject("vPosition"), new vertextAttributeObject("vColor"), new vertextAttributeObject("vNormal"));
	this.vertexAttrValues.push(points, colors, normals);
	
}


