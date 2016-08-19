
// simple pass through vertex shader

precision mediump float;

attribute vec4 vPosition;
attribute vec4 vColor;
attribute vec4 vNormal;

varying vec4 fColor;
varying vec4 fNormal;
varying vec3 L, E, N;
varying vec4 fPosition;
varying float attenuation;

uniform mat4 modelView;
uniform mat4 projection;
uniform vec3 eyePosition;

void main() {
	
	fColor = vColor;
	fNormal = vNormal;
	fPosition = vPosition;
	
	vec4 lightPosition;
	//lightPosition = vec4(30,25,30,1.0); // light position in world space
	lightPosition = vec4(eyePosition,1.0); // set light position to eye
	
	// Attenuation (calculated in world space, cause that makes sense (although the MV transformation preserves distances, actually... so it doesn't really matter.))
	float d = distance(vPosition, lightPosition);
	attenuation = 1.0 /(0.55 + 0.005*d + 0.0001*d*d);
	
	N = (vNormal).xyz; // surface normal in world space
	L = (lightPosition - vPosition).xyz; // direction towards light from this vertex in world space
	E = eyePosition - (vPosition).xyz; // direction towards the eye from this vertex in world space
	
	gl_Position = projection * modelView * vPosition;
}