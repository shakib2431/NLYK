import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// Procedural soft ground drop shadow texture
function createShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createRadialGradient(256, 256, 20, 256, 256, 240);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  grad.addColorStop(0.35, 'rgba(0, 0, 0, 0.45)');
  grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.12)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export default function RotatingPackage3D({ className = 'w-[95px] h-[115px]' }) {
  const mountRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Accurate container dimensions
    const rect = container.getBoundingClientRect();
    const width = Math.round(rect.width) || container.clientWidth || 95;
    const height = Math.round(rect.height) || container.clientHeight || 115;

    // High-DPI support: set pixel ratio BEFORE sizing
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 3);

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 6.4);
    camera.lookAt(0, 0, 0);

    // WebGL Renderer with full antialiasing
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(width, height, true);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const dom = renderer.domElement;
    dom.style.width = '100%';
    dom.style.height = '100%';
    dom.style.display = 'block';
    container.appendChild(dom);

    // Group for bag assembly (pivots cleanly around center)
    const bagGroup = new THREE.Group();
    bagGroup.scale.set(0.95, 0.95, 0.95);
    scene.add(bagGroup);

    // 1. Boutique Die-Cut Carrier Bag Geometry (identical to luxury streetwear carrier bags)
    const shape = new THREE.Shape();
    const bagW = 1.45;
    const bagH = 2.2;
    shape.moveTo(-bagW / 2, -bagH / 2);
    shape.lineTo(bagW / 2, -bagH / 2);
    shape.lineTo(bagW / 2, bagH / 2);
    shape.lineTo(-bagW / 2, bagH / 2);
    shape.closePath();

    // Die-cut oval handle punch-out hole near the top
    const hole = new THREE.Path();
    hole.absellipse(0, bagH / 2 - 0.36, 0.26, 0.1, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const depth = 0.44;
    const extrudeSettings = {
      depth,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    };

    const bagGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    bagGeo.center();

    // Clean matte chalk off-white paper material
    const bagMat = new THREE.MeshStandardMaterial({
      color: 0xF4F3EE,
      roughness: 0.35,
      metalness: 0.02,
    });

    const bagMesh = new THREE.Mesh(bagGeo, bagMat);
    bagGroup.add(bagMesh);

    // 2. High-Resolution Vector-Crisp NALAYAK Logo (1672x941 PNG asset)
    const textureLoader = new THREE.TextureLoader();
    const logoTexture = textureLoader.load(
      '/NALayak%20Compass%20Gothic%20Logo.png',
      () => {
        const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
        logoTexture.anisotropy = maxAnisotropy;
        logoTexture.generateMipmaps = true;
        logoTexture.minFilter = THREE.LinearMipmapLinearFilter;
        logoTexture.magFilter = THREE.LinearFilter;
        logoTexture.needsUpdate = true;
      }
    );
    logoTexture.colorSpace = THREE.SRGBColorSpace;

    // Logo Material: crisp, pitch-black, unaffected by lighting haze
    const logoMat = new THREE.MeshBasicMaterial({
      map: logoTexture,
      transparent: true,
      depthWrite: false,
    });

    // Logo dimensions matching asset aspect ratio (1672 / 941 = 1.777)
    const logoW = 1.05;
    const logoH = logoW / 1.777;
    const logoGeo = new THREE.PlaneGeometry(logoW, logoH);

    // Front Logo Mesh (placed cleanly on front face)
    const frontLogo = new THREE.Mesh(logoGeo, logoMat);
    frontLogo.position.set(0, -0.12, depth / 2 + 0.022);
    bagGroup.add(frontLogo);

    // Back Logo Mesh (placed cleanly on reverse face)
    const backLogo = new THREE.Mesh(logoGeo, logoMat);
    backLogo.position.set(0, -0.12, -depth / 2 - 0.022);
    backLogo.rotation.y = Math.PI;
    bagGroup.add(backLogo);

    // 3. Ground Soft Drop Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(3.4, 2.2);
    const shadowTex = createShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -1.18;
    scene.add(shadowMesh);

    // 4. Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 5, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe8f0f8, 1.2);
    fillLight.position.set(-3, 3, 2);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.6);
    rimLight.position.set(0, 3, -4);
    scene.add(rimLight);

    // Interaction & Animation State
    let isDragging = false;
    let prevPointerX = 0;
    let targetRotationY = 0.35;
    let autoRotationSpeed = 0.012;
    let animationFrameId = null;
    let clock = new THREE.Clock();
    let isVisible = true;

    // Pointer events for drag-to-rotate
    const onPointerDown = (e) => {
      isDragging = true;
      prevPointerX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      const currentX = e.clientX ?? (e.touches && e.touches[0]?.clientX) ?? 0;
      const deltaX = currentX - prevPointerX;
      prevPointerX = currentX;
      targetRotationY += deltaX * 0.015;
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    dom.style.cursor = 'grab';
    dom.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Pause rendering loop when offscreen to save resources
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // Render loop
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (!isVisible) return;

      const elapsedTime = clock.getElapsedTime();

      if (!isDragging) {
        targetRotationY += autoRotationSpeed;
      }

      // Smooth damping
      bagGroup.rotation.y += (targetRotationY - bagGroup.rotation.y) * 0.1;

      // Subtle float / bobbing animation
      const bob = Math.sin(elapsedTime * 1.8) * 0.03;
      bagGroup.position.y = bob;

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const r = container.getBoundingClientRect();
      const w = Math.round(r.width) || container.clientWidth || 95;
      const h = Math.round(r.height) || container.clientHeight || 115;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, true);
    };

    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      dom.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);

      // Clean disposal
      bagGeo.dispose();
      logoGeo.dispose();
      shadowGeo.dispose();
      bagMat.dispose();
      logoMat.dispose();
      shadowMat.dispose();
      logoTexture.dispose();
      shadowTex.dispose();
      renderer.dispose();
      if (dom.parentElement) {
        dom.parentElement.removeChild(dom);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className={`relative select-none touch-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title="NALAYAK Carrier Bag · 3D Interactive (Drag to rotate)"
      aria-label="3D Rotating NALAYAK Carrier Bag"
    >
      <div
        className={`absolute -bottom-1 inset-x-0 text-center pointer-events-none transition-opacity duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <span className="text-[8px] tracking-[0.15em] font-mono uppercase bg-paper/10 text-paper/85 px-1.5 py-0.5 rounded backdrop-blur-sm border border-paper/15 whitespace-nowrap">
          3D ROTATE
        </span>
      </div>
    </div>
  );
}
