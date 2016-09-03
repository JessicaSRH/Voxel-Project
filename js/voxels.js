"use strict"


// Landscape generator object
var VoxelGenerator = function(seed){
	
	var Perlin = new SimplexNoise({random : new Math.seedrandom(seed)});
	var Perlin2 = new SimplexNoise({random : new Math.seedrandom(seed[1]+seed[0]+seed.slice(2,seed.length))});
	var Perlin3 = new SimplexNoise({random : new Math.seedrandom(seed[0]+seed[2]+seed[1]+seed.slice(3,seed.length))});
	var Perlin4 = new SimplexNoise({random : new Math.seedrandom(seed[0]+seed[1]+seed[3]+seed[2]+seed.slice(4,seed.length))});
	
	return {
		get : function(x,y,z){ return CliffsAndCaves(x,y,z, Perlin, Perlin2, Perlin3, Perlin4); }
	}
	
}



// First attempt at an interesting world generation function
var CliffsAndCaves = function(x,y,z, Perlin, Perlin2, Perlin3, Perlin4){
	var s = Perlin.noise3d(x/35,y/35,z/35);// selector
	var d1 = Perlin.noise3d(x/100,y/200,z/100); // density 1 (large features; useful for general terrain)
	var d2 = Perlin2.noise3d(x/100,y/100,z/100); // density 2 (smaller features; useful for smaller caves and stuff)
	var d = (s > -0.5) ? d1 : d2;
	var r = Math.abs(Perlin.noise3d(x/20,y/100,z/20)); // ruggedness
	var h = y/64; // height offset
	var e = (Perlin4.noise(x/100, z/100)+1)/2; // 2d height map
	
	var d_weight = 0.95; // the weights must add up to 1
	var r_weight = 0.05; // ruggedness weight; increase to make terrain more rugged...
	
	var f = d_weight*d    + r_weight*r + h; // result dictating if there should be a voxel
	var v = d_weight*d1*e + r_weight*r + h; // result dictating voxel type
	
	if (f > 0.25) return VOXEL_TYPES.DEFAULT;
	
	if (v < -0.05) return VOXEL_TYPES.STONE;
	if (v < -0.00) return VOXEL_TYPES.DIRT;
	if (v < 0.05) return VOXEL_TYPES.GRASS;
	
	return VOXEL_TYPES.DEFAULT;
}


// First attempt at an interesting world generation function
var PlainsWithCraters = function(x,y,z, Perlin, Perlin2, Perlin3){
	var s = Perlin.noise3d(x/50,y/50,z/50);// selector
	var d1 = Perlin.noise3d(x/100,y/100,z/100); // density 1 (large features; useful for general terrain)
	var d2 = Perlin2.noise3d(x/100,y/100,z/100); // density 2 (smaller features; useful for smaller caves and stuff)
	var d = (s > -0.65) ? d1 : d2;
	var r = Math.abs(Perlin.noise3d(x/20,y/20,z/20)); // ruggedness
	var h = y/5; // height offset
	
	var d_weight = 0.97; // the weights must add up to 1
	var r_weight = 0.03; // ruggedness weight; increase to make terrain more rugged...
	
	var f = d_weight*d +r_weight*r+h; // result dictating if there should be a voxel
	var v = d_weight*d1+r_weight*r+h; // result dictating voxel type
	
	if (f > 0) return VOXEL_TYPES.DEFAULT;
	
	if (v < -0.6) return VOXEL_TYPES.STONE;
	if (v < -0.3) return VOXEL_TYPES.DIRT;
	if (v < 0) return VOXEL_TYPES.GRASS;
	
	return VOXEL_TYPES.DEFAULT;
}



// Wavy-crazy-world
var WavyWorld = function(x,y,z){
	var d = Perlin.noise3d(x/100,y/100,z/100)*50; // density
	var r = Perlin.noise3d(x/20,y/20,z/20)*5; // ruggedness
	var h = Perlin.noise(x/200,z/200)*48; // height offset
	
	var f = h + y*Math.abs(d) + r; // final combined value
	
	if (f < -5) return VOXEL_TYPES.STONE;
	if (f < 0) return VOXEL_TYPES.GRASS;
	
	return VOXEL_TYPES.DEFAULT
}

// Some sick shit yo
var SickShit = function(x,y,z){
	var d = Perlin.noise3d(x/10,y/10,z/10)*50; // density
	d *= Math.abs(d)*0.1;
	var h = y; // height offset
	
	var f = d + h; // final combined value
	
	if (f < -5) return VOXEL_TYPES.STONE;
	if (f < 0) return VOXEL_TYPES.GRASS;
	
	return VOXEL_TYPES.DEFAULT
}


// Cool valley-ish terrain thingy
var ValleyTerrainGenerator2D = function(x,y,z){
	var h = Perlin.noise(x/200,z/200)*48+20; // elevation term
	var r = Perlin.noise(x/5,z/5)/2; // ruggedness/smoothness term
	
	//sharper peaks, flatter valleys
	h *= Math.abs(h)*0.025;
	
	if (y < 0.9*h+r) return VOXEL_TYPES.GRASS;
	if (y < h+r) return VOXEL_TYPES.STONE;
	
	return VOXEL_TYPES.DEFAULT;
}

// Cool plans ish terrain thingy
var PlainsTerrainGenerator2D = function(x,y,z){
	return (Perlin.noise(x/200,z/200)*4 < y) ? VOXEL_TYPES.DEFAULT : VOXEL_TYPES.GRASS;
}

// Cool space world thingy
var FloatingVoxelsGenerator = function(x,y,z){
	return (Perlin.noise3d(x,y,z) < 0.8) ? VOXEL_TYPES.DEFAULT : VOXEL_TYPES.GRASS;
}

var OneCubeGenerator = function(x,y,z){
	return (x >= 0 && y >= 0 && z >= 0 && x < CHUNK_SIZE && y < CHUNK_SIZE && z < CHUNK_SIZE) ? VOXEL_TYPES.GRASS : VOXEL_TYPES.DEFAULT;
}

var OneSphereGenerator = function(x,y,z){
	return ((x - (CHUNK_SIZE/2))*(x - (CHUNK_SIZE/2)) + (y - (CHUNK_SIZE/2))*(y - (CHUNK_SIZE/2)) + (z - (CHUNK_SIZE/2))*(z - (CHUNK_SIZE/2)) < (CHUNK_SIZE/2) * (CHUNK_SIZE/2)) ? VOXEL_TYPES.GRASS : VOXEL_TYPES.DEFAULT;
}

// Set the default terrain generator
var DefaultVoxelGenerator = VoxelGenerator;

// "enum" for block types
const VOXEL_TYPES = {
	DEFAULT:	"0", // a 1-character string is the smallest primitive data type in javascript
	GRASS:		"1",
	DIRT:		"2",
	WATER:		"3",
	STONE:		"4",
	WOOD:		"5",
	SAND:		"6"
}

// Phong lighting coefficients for each voxel type
// Indexing: [ r, g, b for ambient,   r, g, b for diffuse,   r, g, b for specular,   shininess ]
const VOXEL_TYPE_LIGHTING = {};
VOXEL_TYPE_LIGHTING[VOXEL_TYPES.DEFAULT]	= [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0];
VOXEL_TYPE_LIGHTING[VOXEL_TYPES.GRASS]		= [0.3, 0.8, 0.3, 0.1, 0.4, 0.1, 0.2, 0.4, 0.2, 80.0];
VOXEL_TYPE_LIGHTING[VOXEL_TYPES.DIRT]		= [0.38, 0.25, 0.07, 0.38, 0.25, 0.07, 0.38, 0.25, 0.07, 80.0];
VOXEL_TYPE_LIGHTING[VOXEL_TYPES.WATER]		= [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0];
VOXEL_TYPE_LIGHTING[VOXEL_TYPES.STONE]		= [0.3, 0.3, 0.3, 0.6, 0.6, 0.5, 0.3, 0.3, 0.3, 150.0];
VOXEL_TYPE_LIGHTING[VOXEL_TYPES.WOOD]		= [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0];
VOXEL_TYPE_LIGHTING[VOXEL_TYPES.SAND]		= [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0];


const SUN_LIGHT_COEFFS = [0.5, 0.5, 0.5, 1.0, 1.0, 1.0, 0.6, 0.6, 0.6];

const VOXEL_TYPE_NAMES = {
	
	DEFAULT:	"Empty", // empty voxels
	GRASS:		"Grass",
	DIRT:		"Dirt",
	WATER:		"Water",
	STONE:		"Stone",
	WOOD:		"Wood",
	SAND:		"Sand"
	
}

