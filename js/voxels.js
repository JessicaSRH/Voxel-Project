





// Cool valley ish terrain thingy
var ValleyTerrainGenerator = function(x,y,z){
	return (Perlin.noise(x/200,z/200)*50 < y) ? VOXEL_TYPES.DEFAULT : VOXEL_TYPES.GRASS;
	
}

// Cool plans ish terrain thingy
var PlainsTerrainGenerator = function(x,y,z){
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
var DefaultVoxelGenerator = OneCubeGenerator;

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
VOXEL_TYPE_LIGHTING[VOXEL_TYPES.DIRT]		= [0.4, 0.8, 0.4, 0.3, 0.8, 0.3, 0.1, 0.4, 0.1, 50.0];
VOXEL_TYPE_LIGHTING[VOXEL_TYPES.GRASS]		= [0.54, 0.27, 0.07, 0.54, 0.27, 0.07, 0.54, 0.27, 0.07, 50.0];
VOXEL_TYPE_LIGHTING[VOXEL_TYPES.WATER]		= [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0];
VOXEL_TYPE_LIGHTING[VOXEL_TYPES.STONE]		= [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 50.0];
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

