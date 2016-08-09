
// simple pass through vertex shader

precision mediump float;

attribute vec4 vPosition;
attribute vec4 vColor;

varying vec4 fColor;

uniform mat4 modelView;
uniform mat4 projection;

void main() {
	fColor = vColor;
	gl_Position = projection * modelView * vPosition;
}