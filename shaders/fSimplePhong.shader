
// simple pass through fragment shader

precision mediump float;

varying vec4 fColor;
varying vec4 fPosition;
varying vec4 fNormal;
varying vec3 L, E, N;
varying float attenuation;

varying vec3 fDiffuseProduct;
varying vec3 fSpecularProduct;
varying vec3 fAmbientProduct;
varying float fMatShininess;

void main() {
	
	// Normalization on fragment shader essential;
	//otherwise the interpolation breaks the normalization which creates horrible artefacts along vertex edges
	vec3 L_ = normalize(L);
	vec3 E_ = normalize(E);
	vec3 N_ = normalize(N);
	
	// Compute halfway vector (Blinn model)
	vec3 H = normalize(L_ + E_); // 
	
	// Compute Phong lighting terms
	vec3 diffuse  = fDiffuseProduct * max(dot(L_,N_), 0.0);
	vec3 specular = fSpecularProduct * pow(max(dot(N_,H), 0.0), fMatShininess);
	
	//gl_FragColor = vec4(ambientProduct + (diffuse + specular) * attenuation, 1);
	gl_FragColor = vec4(fAmbientProduct + (diffuse + specular) * attenuation, 1);
	
}