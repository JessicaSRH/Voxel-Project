
/*
Copyright (c) 2016 Johnny Skaarup Redzin Hansen

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial
portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO
EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR
THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

"use strict"


// object used to handle vertex attributes
function vertextAttributeObject(attrName_, size){
	
	const attrName = attrName_;
	var length = 0;
	var size = size;
	
	const vBuffer = gl.createBuffer();
	var vBufferLoc;
	
	function Transfer(shaderProgram, attrValues){ // call to transfer vertex attributes to the gpu
		
		gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
		gl.bufferData( gl.ARRAY_BUFFER, flatten(attrValues), gl.STATIC_DRAW );
		
		vBufferLoc = gl.getAttribLocation( shaderProgram, attrName );
		gl.vertexAttribPointer( vBufferLoc, size, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( vBufferLoc );
		
		this.length = attrValues.length;
		
	}
	
	function Enable(shaderProgram){ // call before rendering to enable the appropriate buffer objects
		// Re-associate this chunks vertex buffer with the shader program
		gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
		gl.vertexAttribPointer( vBufferLoc, size, gl.FLOAT, false, 0, 0 );
		gl.enableVertexAttribArray( vBufferLoc );
		
	}
	
	return {
		length: length,
		
		Transfer: Transfer,
		Enable: Enable
	}
}


// vertex uniform object
function vertexUniformObject(uniformName, glUniformFunction){
	
	var glUniformFunction = glUniformFunction;
	
	var uniformLoc;
	
	function Transfer(shaderProgram, value){
		uniformLoc = gl.getUniformLocation(shaderProgram, uniformName);
		glUniformFunction(uniformLoc, value);
	}
	
	return {
		Transfer: Transfer
	}
}

// enum for gl uniform transfer types
const UNIFORM_TYPE = {
	MATRIX_4		: function(uniformLoc, value){ gl.uniformMatrix4fv(uniformLoc, false, value) },
	MATRIX_4_INVERT	: function(uniformLoc, value){ gl.uniformMatrix4fv(uniformLoc, true, value) },
	MATRIX_3		: function(uniformLoc, value){ gl.uniformMatrix3fv(uniformLoc, false, value) },
	MATRIX_3_INVERT	: function(uniformLoc, value){ gl.uniformMatrix3fv(uniformLoc, true, value) },
	MATRIX_2		: function(uniformLoc, value){ gl.uniformMatrix2fv(uniformLoc, false, value) },
	MATRIX_2_INVERT	: function(uniformLoc, value){ gl.uniformMatrix2fv(uniformLoc, false, value) },
	VECTOR_4f		: function(uniformLoc, value){ gl.uniform4fv(uniformLoc, value) },
	VECTOR_3f		: function(uniformLoc, value){ gl.uniform3fv(uniformLoc, value) },
	VECTOR_2f		: function(uniformLoc, value){ gl.uniform2fv(uniformLoc, value) },
	VECTOR_1f		: function(uniformLoc, value){ gl.uniform1fv(uniformLoc, value) },
	VECTOR_4i		: function(uniformLoc, value){ gl.uniform4iv(uniformLoc, value) },
	VECTOR_3i		: function(uniformLoc, value){ gl.uniform3iv(uniformLoc, value) },
	VECTOR_2i		: function(uniformLoc, value){ gl.uniform2iv(uniformLoc, value) },
	VECTOR_1i		: function(uniformLoc, value){ gl.uniform1iv(uniformLoc, value) },
	FLOAT_1			: function(uniformLoc, value){ gl.uniform1f(uniformLoc, value) },
	FLOAT_2			: function(uniformLoc, value){ gl.uniform2f(uniformLoc, value[0], value[1]) },
	FLOAT_3			: function(uniformLoc, value){ gl.uniform3f(uniformLoc, value[0], value[1], value[2]) },
	FLOAT_4			: function(uniformLoc, value){ gl.uniform4f(uniformLoc, value[0], value[1], value[2], value[3]) },
	INT_1			: function(uniformLoc, value){ gl.uniform1i(uniformLoc, value) },
	INT_2			: function(uniformLoc, value){ gl.uniform2i(uniformLoc, value[0], value[1]) },
	INT_3			: function(uniformLoc, value){ gl.uniform3i(uniformLoc, value[0], value[1], value[2]) },
	INT_4			: function(uniformLoc, value){ gl.uniform4i(uniformLoc, value[0], value[1], value[2], value[3]) },
}

const ATTRIBUTE_TYPE = {
	
}

// transfer uniforms
function TransferUniforms(shaderProgram, uniformObjects, uniformValues){
	for(var i = 0; i < uniformObjects.length; i++){
		uniformObjects[i].Transfer(shaderProgram, flatten(uniformValues[i]));
	}
}

// transfer	vertex attributes
function TransferVertexAttributes(shaderProgram, vertexBuffers, vertexAttrValues){
	for(var i = 0; i < vertexBuffers.length; i++){
		vertexBuffers[i].Transfer(shaderProgram, vertexAttrValues[i]);
	}
}


// Render the provided array of vertex vertex attributes values (vertexAttrValues) using the provided attribute buffers (vertexBuffers) and the provided shaderProgram
// Also sends the provided uniforms in the uniformValues array using the uniform buffer objects provided
// *** NOTE *** Not very efficient for drawing many vertices, since each vertex is transfere before every draw call!
// It's fine for debugging though
// For actual rendering (not debugging), compose and transfer the vertex buffers etc. manually (using the above objects)
function render(gl, shaderProgram, mode, uniformObjects, uniformValues, vertexBuffers, vertexAttrValues){
	
	gl.useProgram(shaderProgram);
	
	TransferUniforms(shaderProgram, uniformObjects, uniformValues);
	TransferVertexAttributes(shaderProgram, vertexBuffers, vertexAttrValues);
	
	gl.drawArrays( mode, 0, vertexAttrValues[0].length );
	
}



