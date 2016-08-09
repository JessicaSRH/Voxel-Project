
// load a file via an http request
function loadFile(url, data, callback, errorCallback) {
    // Set up an asynchronous request
    var request = new XMLHttpRequest();
    request.open('GET', url, false); // set to true for ajax instead of sjax... is a mess though

    // Hook the event that gets called as the request progresses
    request.onreadystatechange = function () {
        // If the request is "DONE" (completed or failed)
        if (request.readyState == 4) {
            // If we got HTTP status 200 (OK)
            if (request.status == 200) {
				callback(request.responseText, data)
            } else { // Failed
                errorCallback(url);
            }
        }
    };

    request.send(null);    
}

function loadFiles(urls, callback, errorCallback) {
    var numUrls = urls.length;
    var numComplete = 0;
    var result = [];

    // Callback for a single file
    function partialCallback(text, urlIndex) {
        result[urlIndex] = text;
        numComplete++;

        // When all files have downloaded
        if (numComplete == numUrls) {
            callback(result);
        }
    }

    for (var i = 0; i < numUrls; i++) {
        loadFile(urls[i], i, partialCallback, errorCallback);
    }
}

/**
 * Creates a shader program.
 * @param {shaderSrc}	an array containing the	vertex shader source
							code in [0] and the fragment source code in [1].
 * @return {WebGLProgram} The shader program resource, ready for use.
 */
function loadShaders (shaderSrc) {
		
	// compile vertex shader
	var vertexShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vertexShader, shaderSrc[0]);
	gl.compileShader( vertexShader );
	if ( !gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS) ) {
		var msg = "Vertex shader failed to compile.  The error log is:"
		+ "<pre>" + gl.getShaderInfoLog( vertexShader ) + "</pre>";
		alert( msg );
		return -1;
	}
	
	// compile fragment shader
	var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fragmentShader, shaderSrc[1]);
	gl.compileShader( fragmentShader );
	if ( !gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS) ) {
		var msg = "Fragment shader failed to compile.  The error log is:"
		+ "<pre>" + gl.getShaderInfoLog( fragmentShader ) + "</pre>";
		alert( msg );
		return -1;
	}
	
	// link the shaders
	var program = gl.createProgram();
	gl.attachShader( program, vertexShader );
	gl.attachShader( program, fragmentShader );
	gl.linkProgram( program );
	
	if ( !gl.getProgramParameter(program, gl.LINK_STATUS) ) {
		var msg = "Shader program failed to link.  The error log is:"
			+ "<pre>" + gl.getProgramInfoLog( program ) + "</pre>";
		alert( msg );
		return -1;
	}
	
	return program;
	
}