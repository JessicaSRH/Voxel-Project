
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


// Plane object; used for frustum culling
function Plane(p0, p1, p2){
	
	var v = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
	var u = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]];
	
	var n = normalize(cross(v, u)); // contains the A, B and C coefficients in the plane equation (Ax + By + Cz + D = 0)
	var D = -dot(n,p0);
	
	function distance(p){
		return dot(n,p) + D;
	}
	
	function project(p){
		var s = p - distance(p);
		return [s*n[0], s*n[1], s*n[2]];
	}
	
	return {
		distance:distance,
		project:project
	}
}


// vertex offsets for each block
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



function getNormal(p1,p2,p3){
	var result = normalize(cross(subtract(p1,p2),subtract(p1,p3))); // should maybe do this manually - is faster (maybe)
	result.push(0);
	return result;
}
