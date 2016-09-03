
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

function DefaultMesher(voxels, chunkPosition){
	MeshingHelper(voxels, chunkPosition, NaiveMeshing, this);
}

function GreedyMesher(voxels, chunkPosition){
	MeshingHelper(voxels, chunkPosition, GreedyMeshing, this);
}

function MeshingHelper(voxels, chunkPosition, MeshingAlgorithm, self){
	
	// reset vertex buffer arrays
	var points = [];
	var colors = [];
	var normals = [];
	var ambientProducts = [];
	var diffuseProducts = [];
	var specularProducts = [];
	var matShininesses = [];
	
	
	// dictionary denoting, for each coordinate (x,y,z), whether it's face is waiting to be included - true if a coordinate is waiting to be included
	var mask = SimpleMasker(voxels);
	
	// set initial mesh flags
	self.flags["isEmpty"] = false;
	self.flags["fullChunkFaces"] = [false, false, false, false, false, false];
	
	// Compute the mesh
	MeshingAlgorithm(chunkPosition, mask, points, normals, colors, ambientProducts, diffuseProducts, specularProducts, matShininesses);
	
	// set the vertex buffers and vertex attributes
	self.vertexBuffers = [
		new vertextAttributeObject("vPosition", 4),
		new vertextAttributeObject("vColor", 4),
		new vertextAttributeObject("vNormal", 4),
		new vertextAttributeObject("vAmbientProduct", 3),
		new vertextAttributeObject("vDiffuseProduct", 3),
		new vertextAttributeObject("vSpecularProduct", 3),
		new vertextAttributeObject("vMatShininess", 1)/**/
	];
	
	self.vertexAttrValues = [points, colors, normals, ambientProducts, diffuseProducts, specularProducts, matShininesses];
	
}



// Mask which faces of each voxel should be drawn - does simple neighbour culling
var SimpleMasker = function(voxels){
	
	var mask = [];
	
	// create mask indicating which voxel faces to include in the mesh
	for(var i = 0; i < CHUNK_SIZE; i++) {				// iterate over each voxel layer
		mask[i] = [];
		for(var j = 0; j < CHUNK_SIZE; j++) {			// iterate vertically
		mask[i][j] = [];
			for(var k = 0; k < CHUNK_SIZE; k++) {		// iterate horizontally
				
				var maskEntry = [false, false, false, false, false, false];
				
				if (voxels[i][j][k] != undefined && voxels[i][j][k] != VOXEL_TYPES.DEFAULT){
					
					if (i+1 >= CHUNK_SIZE || voxels[i+1][j][k] == VOXEL_TYPES.DEFAULT) maskEntry[0] = voxels[i][j][k]; // positive x
					if (j+1 >= CHUNK_SIZE || voxels[i][j+1][k] == VOXEL_TYPES.DEFAULT) maskEntry[2] = voxels[i][j][k]; // positive y
					if (k+1 >= CHUNK_SIZE || voxels[i][j][k+1] == VOXEL_TYPES.DEFAULT) maskEntry[4] = voxels[i][j][k]; // positive z
					if (i-1 < 0 || voxels[i-1][j][k] == VOXEL_TYPES.DEFAULT) maskEntry[1] = voxels[i][j][k]; // negative x
					if (j-1 < 0 || voxels[i][j-1][k] == VOXEL_TYPES.DEFAULT) maskEntry[3] = voxels[i][j][k]; // negative y
					if (k-1 < 0 || voxels[i][j][k-1] == VOXEL_TYPES.DEFAULT) maskEntry[5] = voxels[i][j][k]; // negative z
					
				}
				
				mask[i][j][k] = maskEntry;
				
			}
		}
	}
	return mask;
}

var NaiveMeshing = function(chunkPosition, mask, points, normals, colors, ambientProducts, diffuseProducts, specularProducts, matShininesses){

	for (var p = 0; p < 6; p++){ // six sides to a voxel
		for(var i = 0; i < CHUNK_SIZE; i++) {
			for(var j = 0; j < CHUNK_SIZE; j++) {
				for(var k = 0; k < CHUNK_SIZE; k++) {
					if(mask[i][j][k][p] != VOXEL_TYPES.DEFAULT){
						
						var t = mask[i][j][k][p];
						var current_ind = [face_vertex_ind[p][0], face_vertex_ind[p][1], face_vertex_ind[p][2], face_vertex_ind[p][0], face_vertex_ind[p][2], face_vertex_ind[p][3]];
						
						for(var q = 0; q < 6; q++){ // six vertices to make two triangles to make a voxel face
							var pos = [];
							pos[0] = vertices[current_ind[q]][0] + i + chunkPosition[0]*CHUNK_SIZE;
							pos[1] = vertices[current_ind[q]][1] + j + chunkPosition[1]*CHUNK_SIZE;
							pos[2] = vertices[current_ind[q]][2] + k + chunkPosition[2]*CHUNK_SIZE;
							pos[3] = vertices[current_ind[q]][3];
							
							points.push(pos);
							normals.push(std_normals[p]);
							colors.push([1,0,0,0]);
							ambientProducts.push(	[SUN_LIGHT_COEFFS[0]*VOXEL_TYPE_LIGHTING[t][0], SUN_LIGHT_COEFFS[1]*VOXEL_TYPE_LIGHTING[t][1], SUN_LIGHT_COEFFS[2]*VOXEL_TYPE_LIGHTING[t][2]]);
							diffuseProducts.push(	[SUN_LIGHT_COEFFS[3]*VOXEL_TYPE_LIGHTING[t][3], SUN_LIGHT_COEFFS[4]*VOXEL_TYPE_LIGHTING[t][4], SUN_LIGHT_COEFFS[5]*VOXEL_TYPE_LIGHTING[t][5]]);
							specularProducts.push(	[SUN_LIGHT_COEFFS[6]*VOXEL_TYPE_LIGHTING[t][6], SUN_LIGHT_COEFFS[7]*VOXEL_TYPE_LIGHTING[t][7], SUN_LIGHT_COEFFS[8]*VOXEL_TYPE_LIGHTING[t][8]]);
							matShininesses.push(VOXEL_TYPE_LIGHTING[t][9]);
						}
					}
				}
			}
		}
	}
	
}

var GreedyMeshing = function(chunkPosition, mask, points, normals, colors, ambientProducts, diffuseProducts, specularProducts, matShininesses){
	
	// list of quads that need to be rendered
	var quads = [];
	
	// temporary variable used to hold the quad that is currently being built
	var quad;
	
	// build a list of quads
	for (var p = 0; p < 6; p++){ // six sides to a voxel
		for(var i = 0; i < CHUNK_SIZE; i++) { // layer
			for(var j = 0; j < CHUNK_SIZE; j++) { // vertical
				for(var k = 0; k < CHUNK_SIZE; k++) { // horizontal
					
					var x, y, z;
					
					switch(p){
						case 0:
							x = i;
							y = k;
							z = j;
							break;
						case 1:
							x = CHUNK_SIZE - 1 - i;
							y = CHUNK_SIZE - 1 - k;
							z = CHUNK_SIZE - 1 - j;
							break;
						case 2:
							x = k;
							y = i;
							z = j;
							break;
						case 3:
							x = CHUNK_SIZE - 1 - j;
							y = CHUNK_SIZE - 1 - i;
							z = CHUNK_SIZE - 1 - k;
							break;
						case 4:
							x = j;
							y = k;
							z = i;
							break;
						case 5:
							x = CHUNK_SIZE - 1 - j;
							y = CHUNK_SIZE - 1 - k;
							z = CHUNK_SIZE - 1 - i;
							break;
					}
					
					if(mask[x][y][z][p] != false && quad == undefined) { // start creating new quad
						
						quad = new Quad(x, y, z, 1, 1, p, mask[x][y][z][p]);
						
					} else if (mask[x][y][z][p] != false && quad != undefined) { // expand horizontally (OMG IT'S ACTUALLY WORKING.)
						
						var newQuad = new Quad(x, y, z, 1, 1, p, mask[x][y][z][p]);
						var wasAdded = quad.add(newQuad);
						
						if (!wasAdded){
							quad = expandQuadVertically(x, y, z, p, quad, quads, mask);
							quads.push(quad);
							quad = newQuad;
						}
						
					}
					
					
					if ((!mask[x][y][z][p] || k == CHUNK_SIZE - 1) && quad != undefined) { // expand vertically
						quad = expandQuadVertically(x, y, z, p, quad, quads, mask);
						quads.push(quad);
						quad = undefined;
					}
					
					mask[x][y][z][p] = false;
					
					
				}
				if (quad != undefined){
					quads.push(quad);
					quad = undefined;
				}
			}
		}
	}
	
	// convert the list of quads to vertex attributes
	for (var i = 0; i < quads.length; i++) {
		var current_ind = [face_vertex_ind[quads[i].n][0], face_vertex_ind[quads[i].n][1], face_vertex_ind[quads[i].n][2], face_vertex_ind[quads[i].n][0], face_vertex_ind[quads[i].n][2], face_vertex_ind[quads[i].n][3]];
		
		var offset = [];
		for(var k = 0; k < 6; k++){
			offset[k] = [vertices[current_ind[k]][0], vertices[current_ind[k]][1], vertices[current_ind[k]][2], vertices[current_ind[k]][3]];
		}
		
		
		switch (quads[i].n){
			case 0:
				offset[0][1] += quads[i].w-1;
				offset[3][1] += quads[i].w-1;
				offset[5][1] += quads[i].w-1;
				offset[0][2] += quads[i].h-1;
				offset[1][2] += quads[i].h-1;
				offset[3][2] += quads[i].h-1;
				break;
			case 1:
				offset[0][1] += quads[i].w-1;
				offset[3][1] += quads[i].w-1;
				offset[5][1] += quads[i].w-1;
				offset[0][2] -= quads[i].h-1;
				offset[1][2] -= quads[i].h-1;
				offset[3][2] -= quads[i].h-1;
				break;
			case 2:
				offset[0][0] += quads[i].w-1;
				offset[3][0] += quads[i].w-1;
				offset[5][0] += quads[i].w-1;
				offset[2][2] += quads[i].h-1;
				offset[4][2] += quads[i].h-1;
				offset[5][2] += quads[i].h-1;
				break;
			case 3:
				offset[0][2] += quads[i].w-1;
				offset[1][2] += quads[i].w-1;
				offset[3][2] += quads[i].w-1;
				offset[2][0] -= quads[i].h-1;
				offset[4][0] -= quads[i].h-1;
				offset[1][0] -= quads[i].h-1;
				break;
			case 4:
				offset[0][1] += quads[i].w-1;
				offset[3][1] += quads[i].w-1;
				offset[5][1] += quads[i].w-1;
				offset[2][0] += quads[i].h-1;
				offset[4][0] += quads[i].h-1;
				offset[5][0] += quads[i].h-1;
				break;
			case 5:
				offset[1][1] += quads[i].w-1;
				offset[2][1] += quads[i].w-1;
				offset[4][1] += quads[i].w-1;
				offset[0][0] -= quads[i].h-1;
				offset[1][0] -= quads[i].h-1;
				offset[3][0] -= quads[i].h-1;
				break;
		}
		
		var t = quads[i].type;
		
		for(var q = 0; q < 6; q++){ // six vertices to make two triangles to make a voxel face
			var pos = [];
			
			pos[0] = quads[i].x + offset[q][0] + chunkPosition[0]*CHUNK_SIZE;
			pos[1] = quads[i].y + offset[q][1] + chunkPosition[1]*CHUNK_SIZE;
			pos[2] = quads[i].z + offset[q][2] + chunkPosition[2]*CHUNK_SIZE;
			pos[3] = 1;
			
			points.push(pos);
			normals.push(std_normals[quads[i].n]);
			colors.push(normalize([quads[i].x,quads[i].y,quads[i].z,1]));
			ambientProducts.push(	[SUN_LIGHT_COEFFS[0]*VOXEL_TYPE_LIGHTING[t][0], SUN_LIGHT_COEFFS[1]*VOXEL_TYPE_LIGHTING[t][1], SUN_LIGHT_COEFFS[2]*VOXEL_TYPE_LIGHTING[t][2]]);
			diffuseProducts.push(	[SUN_LIGHT_COEFFS[3]*VOXEL_TYPE_LIGHTING[t][3], SUN_LIGHT_COEFFS[4]*VOXEL_TYPE_LIGHTING[t][4], SUN_LIGHT_COEFFS[5]*VOXEL_TYPE_LIGHTING[t][5]]);
			specularProducts.push(	[SUN_LIGHT_COEFFS[6]*VOXEL_TYPE_LIGHTING[t][6], SUN_LIGHT_COEFFS[7]*VOXEL_TYPE_LIGHTING[t][7], SUN_LIGHT_COEFFS[8]*VOXEL_TYPE_LIGHTING[t][8]]);
			matShininesses.push(VOXEL_TYPE_LIGHTING[t][9]);
		}
	}
	
}


function Quad(x, y, z, w, h, n, type){
	
	return {
		
		x:x, // x coordinate
		y:y, // y coordinate
		z:z, // z coordinate
		w:w, // width
		h:h, // height
		n:n, // normal index (0 for +x, 1 for -x, 2 for +y, etc...)
		type:type, // voxel type
		add: addQuad,
		compare: function(otherQuad){ return compareQuads(this, otherQuad); } // compare to another quad according a defined total ordering
		
	}
	
}


function expandQuadVertically(x, y, z, p, quad, quads, mask){
	
	var canExpandVertically = true;
	var v_index = 1;
	while(canExpandVertically){
		for(var w = 0; w < quad.w; w++){
			switch(p){
				case 0:
					canExpandVertically = canExpandVertically && quad.z+v_index < CHUNK_SIZE && mask[x][quad.y+w][quad.z+v_index][p] == quad.type;
					break;
				case 1:
					canExpandVertically = canExpandVertically && quad.z-v_index >= 0 && mask[x][quad.y+w][quad.z-v_index][p] == quad.type;
					break;
				case 2:
					canExpandVertically = canExpandVertically && quad.z+v_index < CHUNK_SIZE && mask[quad.x+w][y][quad.z+v_index][p] == quad.type;
					break;
				case 3:
					canExpandVertically = canExpandVertically && quad.x-v_index >= 0 && mask[quad.x-v_index][y][quad.z+w][p] == quad.type;
					break;
				case 4:
					canExpandVertically = canExpandVertically && quad.x+v_index < CHUNK_SIZE && mask[quad.x+v_index][quad.y+w][z][p] == quad.type;
					break;
				case 5:
					canExpandVertically = canExpandVertically && quad.x-v_index >= 0 && mask[quad.x-v_index][quad.y+w][z][p] == quad.type;
					break;
			}
		}
		if(canExpandVertically) {
			for(var w = 0; w < quad.w; w++){
				switch(p){
					case 0:
						mask[x][quad.y+w][quad.z+v_index][p] = false;
						break;
					case 1:
						mask[x][quad.y+w][quad.z-v_index][p] = false;
						break;
					case 2:
						mask[quad.x+w][y][quad.z+v_index][p] = false;
						break;
					case 3:
						mask[quad.x-v_index][y][quad.z+w][p] = false;
						break;
					case 4:
						mask[quad.x+v_index][quad.y+w][z][p] = false;
						break;
					case 5:
						mask[quad.x-v_index][quad.y+w][z][p] = false;
						break;
				}
			}
			quad.h += 1;
		}
		v_index++;
	}
	
	return quad;
	
}



// add a quad to this quad
// returns true on success
// false on failure (quads not aligned or incompatible sizes)
function addQuad (q2){
	if (q2 == undefined) return false;
	if (this.n != q2.n) return false;
	if (this.type != q2.type) return false;
	
	switch(this.n){
		case 0:
			if (this.z+this.h == q2.z		 && this.w == q2.w && this.y == q2.y) { // q2 is above
				this.h += q2.h;
				return true;
			
			} else if (this.z == q2.z+q2.h	 && this.w == q2.w && this.y == q2.y) { // q2 is below,
				this.h += q2.h;
				this.z = q2.z;
				return true;
			
			} else if (this.y == q2.y+q2.w 	 && this.h == q2.h && this.z == q2.z) { // q2 is left,
				this.w += q2.w;
				this.y = q2.y;
				return true;
			
			} else if (this.y+this.w == q2.y && this.h == q2.h && this.z == q2.z) { // q2 is right,
				this.w += q2.w;
				return true;
			}
			break;
		case 1:
			if (this.z+this.h == q2.z		 && this.w == q2.w && this.y == q2.y) { // q2 is above
				this.h += q2.h;
				return true;
			
			} else if (this.z == q2.z+q2.h	 && this.w == q2.w && this.y == q2.y) { // q2 is below,
				this.h += q2.h;
				this.z = q2.z;
				return true;
			
			} else if (this.y == q2.y+q2.w 	 && this.h == q2.h && this.z == q2.z) { // q2 is left,
				this.w += q2.w;
				this.y = q2.y;
				return true;
			
			} else if (this.y+this.w == q2.y && this.h == q2.h && this.z == q2.z) { // q2 is right,
				this.w += q2.w;
				return true;
			}
			break;
		case 2:
			if (this.x+this.w == q2.x		 && this.h == q2.h && this.z == q2.z) { // q2 is above
				this.w += q2.w;
				return true;
			
			} else if (this.x == q2.x+q2.w	 && this.h == q2.h && this.z == q2.z) { // q2 is below,
				this.w += q2.w;
				this.z = q2.z;
				return true;
			
			} else if (this.z == q2.z+q2.w 	 && this.h == q2.h && this.x == q2.x) { // q2 is left,
				this.h += q2.h;
				this.x = q2.x;
				return true;
			
			} else if (this.z+this.w == q2.z && this.h == q2.h && this.x == q2.x) { // q2 is right,
				this.h += q2.h;
				return true;
			}
			break;
		case 3:
			if (this.x+this.h == q2.x		 && this.w == q2.w && this.z == q2.z) { // q2 is above
				this.h += q2.h;
				return true;
			
			} else if (this.x == q2.x+q2.h	 && this.w == q2.w && this.z == q2.z) { // q2 is below,
				this.h += q2.h;
				this.x = q2.x;
				return true;
			
			} else if (this.z == q2.z+q2.w 	 && this.h == q2.h && this.x == q2.x) { // q2 is left,
				this.w += q2.w;
				this.z = q2.z;
				return true;
			
			} else if (this.z+this.w == q2.z && this.h == q2.h && this.x == q2.x) { // q2 is right,
				this.w += q2.w;
				return true;
			}
			break;
		case 4:
			if (this.x+this.h == q2.x		 && this.w == q2.w && this.y == q2.y) { // q2 is above
				this.h += q2.h;
				return true;
			
			} else if (this.x == q2.x+q2.h	 && this.w == q2.w && this.y == q2.y) { // q2 is below,
				this.h += q2.h;
				this.x = q2.x;
				return true;
			
			} else if (this.y == q2.y+q2.w 	 && this.h == q2.h && this.x == q2.x) { // q2 is left,
				this.w += q2.w;
				this.y = q2.y;
				return true;
			
			} else if (this.y+this.w == q2.y && this.h == q2.h && this.x == q2.x) { // q2 is right,
				this.w += q2.w;
				return true;
			}
			break;
		case 5:
			if (this.x+this.h == q2.x		 && this.w == q2.w && this.y == q2.y) { // q2 is above
				this.h += q2.h;
				return true;
			
			} else if (this.x == q2.x+q2.h	 && this.w == q2.w && this.y == q2.y) { // q2 is below,
				this.h += q2.h;
				this.x = q2.x;
				return true;
			
			} else if (this.y == q2.y+q2.w 	 && this.h == q2.h && this.x == q2.x) { // q2 is left,
				this.w += q2.w;
				this.y = q2.y;
				return true;
			
			} else if (this.y+this.w == q2.y && this.h == q2.h && this.x == q2.x) { // q2 is right,
				this.w += q2.w;
				return true;
			}
			break;
	}
	
	return false;
}
























/* DEPRECATED AS FUCK, DON'T USE */
// Default mesher function
var DefaultMesher_OLD = function (voxels, chunkPosition){
	
	// reset vertex buffer arrays
	var points = [];
	var colors = [];
	var normals = [];
	
	for(var i = 0; i < CHUNK_SIZE; i++) {
		
		for(var j = 0; j < CHUNK_SIZE; j++) {
			
			for(var k = 0; k < CHUNK_SIZE; k++) {
				
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
					
					createCube([i,j,k], shouldDraw);
					
				}
			}
		}
	}
	
	
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
	this.vertexBuffers = [new vertextAttributeObject("vPosition", 4), new vertextAttributeObject("vColor", 4), new vertextAttributeObject("vNormal", 4)];
	this.vertexAttrValues = [points, colors, normals];
	
}


