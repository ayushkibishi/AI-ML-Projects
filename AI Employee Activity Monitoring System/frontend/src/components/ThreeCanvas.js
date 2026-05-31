'use client';

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export default function ThreeCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Dimensions
    const width = currentMount.clientWidth;
    const height = currentMount.clientHeight;

    // 1. Setup Scene, Camera & Renderer
    const scene = new THREE.Scene();
    
    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 10, 22);
    camera.lookAt(0, 0, 0);

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // 2. Add Ambient & Directional Lights
    const ambientLight = new THREE.AmbientLight(0x06b6d4, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xec4899, 1.2, 100);
    pointLight.position.set(10, 20, 10);
    scene.add(pointLight);

    // 3. Create Rotating Digital Globe
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Wireframe Sphere
    const globeGeom = new THREE.SphereGeometry(4, 24, 24);
    const globeMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.12
    });
    const globeMesh = new THREE.Mesh(globeGeom, globeMat);
    globeGroup.add(globeMesh);

    // Globe points (neural network vertices)
    const pointsGeom = new THREE.SphereGeometry(4.05, 30, 30);
    const pointsMat = new THREE.PointsMaterial({
      color: 0x00ffff,
      size: 0.05,
      transparent: true,
      opacity: 0.8
    });
    const globePoints = new THREE.Points(pointsGeom, pointsMat);
    globeGroup.add(globePoints);

    // Latitude / Longitude ring tracks
    const ringMat = new THREE.LineBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.3
    });
    for (let i = 0; i < 3; i++) {
      const ringGeom = new THREE.BufferGeometry();
      const vertices = [];
      const segments = 64;
      const radius = 4.1;
      for (let j = 0; j <= segments; j++) {
        const theta = (j / segments) * Math.PI * 2;
        if (i === 0) vertices.push(radius * Math.cos(theta), radius * Math.sin(theta), 0);
        else if (i === 1) vertices.push(radius * Math.cos(theta), 0, radius * Math.sin(theta));
        else vertices.push(0, radius * Math.cos(theta), radius * Math.sin(theta));
      }
      ringGeom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      const ring = new THREE.Line(ringGeom, ringMat);
      globeGroup.add(ring);
    }

    globeGroup.position.set(-6, 2, 0);

    // 4. Create Animated Office Floor Plan Mockup (Wireframe Cubes)
    const officeGroup = new THREE.Group();
    scene.add(officeGroup);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(16, 16, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = -2;
    officeGroup.add(gridHelper);

    // Desk Blocks
    const deskGeom = new THREE.BoxGeometry(2, 0.8, 1);
    const deskMat = new THREE.MeshBasicMaterial({
      color: 0x0891b2,
      wireframe: true,
      transparent: true,
      opacity: 0.4
    });

    const desks = [];
    const deskCoords = [
      [-3, -1.6, -2], [-3, -1.6, 0], [-3, -1.6, 2],
      [3, -1.6, -2], [3, -1.6, 0], [3, -1.6, 2]
    ];

    deskCoords.forEach(([x, y, z]) => {
      const desk = new THREE.Mesh(deskGeom, deskMat);
      desk.position.set(x, y, z);
      officeGroup.add(desk);
      desks.push(desk);
    });

    // Server Cabinets (Secure Area)
    const serverGeom = new THREE.BoxGeometry(1.5, 3.5, 1.5);
    const serverMat = new THREE.MeshBasicMaterial({
      color: 0xec4899,
      wireframe: true,
      transparent: true,
      opacity: 0.35
    });
    const server = new THREE.Mesh(serverGeom, serverMat);
    server.position.set(0, -0.25, -4);
    officeGroup.add(server);

    officeGroup.position.set(6, 0, 0);

    // 5. Create Floating AI Particles (Starfield Effect)
    const particleCount = 180;
    const particlesGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 45;      // x
      particlePositions[i + 1] = (Math.random() - 0.5) * 20;  // y
      particlePositions[i + 2] = (Math.random() - 0.5) * 30;  // z
    }

    particlesGeom.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    
    const particlesMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.08,
      transparent: true,
      opacity: 0.6
    });

    const starfield = new THREE.Points(particlesGeom, particlesMat);
    scene.add(starfield);

    // 6. Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotate Globe
      globeGroup.rotation.y = elapsedTime * 0.15;
      globeGroup.rotation.x = elapsedTime * 0.05;

      // Pulse Office wireframes slightly
      const pulse = 0.3 + 0.15 * Math.sin(elapsedTime * 2);
      deskMat.opacity = pulse;
      serverMat.opacity = pulse * 1.2;

      // Spin Office group slowly
      officeGroup.rotation.y = elapsedTime * 0.08;

      // Orbit Starfield
      starfield.rotation.y = elapsedTime * -0.02;

      renderer.render(scene, camera);
    };
    
    animate();

    // 7. Handle Resize
    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth;
      const h = currentMount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (renderer.domElement && currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      // Dispose materials & geometries
      globeGeom.dispose();
      globeMat.dispose();
      pointsGeom.dispose();
      pointsMat.dispose();
      ringMat.dispose();
      deskGeom.dispose();
      deskMat.dispose();
      serverGeom.dispose();
      serverMat.dispose();
      particlesGeom.dispose();
      particlesMat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      className="w-full h-full min-h-[350px] relative pointer-events-none opacity-80" 
    />
  );
}
