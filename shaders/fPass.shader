
// simple pass through fragment shader

precision mediump float;

varying vec4 fColor;

void main() {
	gl_FragColor = fColor;
}