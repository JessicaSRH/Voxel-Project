
// simple pass through fragment shader

precision mediump float;

varying vec4 fColor;
varying vec4 fPosition;
varying vec4 fNormal;
varying vec3 L, E, N;
varying float attenuation;

varying vec3 diffuseProduct;
varying vec3 specularProduct;
varying vec3 ambientProduct;
varying float matShininess;

void main() {
	
	//vec3 diffuseProduct = vec3(0.5, 0.5, 0.4);
	//vec3 specularProduct = vec3(0.1, 0.1, 0.05);
	//vec3 ambientProduct = vec3(0.1,0,0);
	
	// Normalization on fragment shader essential;
	//otherwise the interpolation breaks the normalization which creates horrible artefacts along vertex edges
	vec3 L_ = normalize(L);
	vec3 E_ = normalize(E);
	vec3 N_ = normalize(N);
	
	// Compute halfway vector (Blinn model)
	vec3 H = normalize(L_ + E_); // 
	
	// Compute Phong lighting terms
	vec3 diffuse  = diffuseProduct * max(dot(L_,N_), 0.0);
	vec3 specular = specularProduct * pow(max(dot(N_,H), 0.0), matShininess);
	
	gl_FragColor = vec4(ambientProduct + (diffuse + specular) * attenuation, 1);
	
}