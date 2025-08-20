import * as THREE from 'three';

// Minimal post-processing: render scene to target, then draw full-screen quad
// with vignette and subtle color grading. No external dependencies.
export class PostFXSystem {
  constructor(renderer, { vignette = 0.0, grain = 0.0, exposure = 1.0 } = {}) {
    this.renderer = renderer;
    this.vignette = vignette;
    this.grain = grain;
    this.exposure = exposure;

    const size = renderer.getSize(new THREE.Vector2());
    this.target = new THREE.WebGLRenderTarget(size.x, size.y, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
      type: THREE.UnsignedByteType,
      // IMPORTANT: keep render target in linear space; the final framebuffer will convert to sRGB
    });
    if (this.target.texture && 'colorSpace' in this.target.texture && THREE.LinearSRGBColorSpace) {
      this.target.texture.colorSpace = THREE.LinearSRGBColorSpace;
    }

    // Fullscreen quad
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: this.target.texture },
        resolution: { value: new THREE.Vector2(size.x, size.y) },
        vignette: { value: this.vignette },
        grain: { value: this.grain },
        exposure: { value: this.exposure },
      },
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */`
        precision highp float;
        uniform sampler2D tColor;
        uniform vec2 resolution;
        uniform float vignette;
        uniform float grain;
        uniform float exposure;
        varying vec2 vUv;

        // simple filmic tonemap-ish curve
        vec3 tonemap(vec3 x){
          return x / (x + vec3(1.0));
        }

        vec3 linearToSRGB(vec3 x){
          // Approximate sRGB encoding
          return pow(clamp(x, 0.0, 1.0), vec3(1.0/2.2));
        }

        void main(){
          vec2 uv = vUv;
          vec3 col = texture2D(tColor, uv).rgb;

          // No color grading to avoid unintended darkening; use the raw color
          col = max(col, 0.0);

          // Global exposure (simple multiply)
          col *= max(0.0, exposure);

          // vignette (strength-controlled). When vignette==0.0 it is fully disabled.
          vec2 center = uv - 0.5;
          float dist = dot(center, center);
          // Use fixed inner/outer radii and scale effect by vignette strength
          float inner = 0.3; // no darkening in center
          float outer = 0.55; // start falloff
          float vigMask = smoothstep(inner, outer, sqrt(dist));
          float vig = clamp(vignette, 0.0, 1.0) * vigMask;
          col *= mix(1.0, 0.86, vig);

          // optional tiny grain
          if (grain > 0.0) {
            float n = fract(sin(dot(uv * resolution, vec2(12.9898,78.233))) * 43758.5453);
            col += (n - 0.5) * grain * 0.02;
          }
          // Convert from linear to sRGB for correct display
          col = linearToSRGB(col);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new THREE.Mesh(quadGeo, this.material);
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene.add(this.quad);
  }

  onResize(w, h) {
    this.target.setSize(w, h);
    this.material.uniforms.resolution.value.set(w, h);
  }

  render(scene, camera) {
    const prevTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.target);
    this.renderer.clear();
    this.renderer.render(scene, camera);
    this.renderer.setRenderTarget(prevTarget);
    this.renderer.render(this.scene, this.camera);
  }
}
