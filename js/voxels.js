





// Cool valley ish terrain thingy
var ValleyTerrainGenerator = function(x,y,z){
	return (Perlin.noise(x/200,z/200)*50 < y) ? VOXEL_TYPES.DEFAULT : VOXEL_TYPES.GRASS;
	
}



// Cool space world thingy
var FloatingVoxelsGenerator = function(x,y,z){
	return (Perlin.noise3d(x,y,z) < 0.8) ? VOXEL_TYPES.DEFAULT : VOXEL_TYPES.GRASS;
}


// Set the default terrain generator
var DefaultVoxelGenerator = ValleyTerrainGenerator;

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

const VOXEL_TYPE_NAMES = {
	
	DEFAULT:	"",
	GRASS:		"Grass",
	DIRT:		"Dirt",
	WATER:		"Water",
	STONE:		"Stone",
	WOOD:		"Wood",
	SAND:		"Sand"
	
	
}

