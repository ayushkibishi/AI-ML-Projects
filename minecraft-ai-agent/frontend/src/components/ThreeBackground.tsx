'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

export default function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Setup Scene, Camera, and Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05080f, 0.015);

    const camera = new THREE.PerspectiveCamera(
      60, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(0, 15, 35);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // 2. Generate Animated Minecraft-like Voxel Grid (Cubes)
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const instancedCount = 120;
    
    // Create an InstancedMesh to draw many cubes efficiently
    const material = new THREE.MeshPhongMaterial({
      color: 0x3b82f6,
      shininess: 80,
      specular: 0xffffff,
      flatShading: true,
      transparent: true,
      opacity: 0.25,
      wireframe: true // Looks extremely cybernetic!
    });
    
    const instancedMesh = new THREE.InstancedMesh(geometry, material, instancedCount);
    
    const dummy = new THREE.Object3D();
    const cubeStates: { pos: THREE.Vector3; speed: number; rotSpeed: number }[] = [];
    
    for (let i = 0; i < instancedCount; i++) {
      // Scatter in a grid-like zone around the center
      const x = (Math.random() - 0.5) * 50;
      const y = (Math.random() - 0.5) * 15 - 5;
      const z = (Math.random() - 0.5) * 50;
      
      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      
      const scale = 0.5 + Math.random() * 1.5;
      dummy.scale.set(scale, scale, scale);
      
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
      
      cubeStates.push({
        pos: new THREE.Vector3(x, y, z),
        speed: 0.05 + Math.random() * 0.1,
        rotSpeed: 0.005 + Math.random() * 0.01
      });
    }
    
    scene.add(instancedMesh);

    // 3. Add Ambient and Directional Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x06b6d4, 1.2);
    dirLight1.position.set(20, 40, 20);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x8b5cf6, 0.8);
    dirLight2.position.set(-20, -20, -20);
    scene.add(dirLight2);

    // 4. Handle Window Resize
    const handleResize = () => {
      if (!canvasRef.current) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // 5. Track Mouse movements to rotate scene subtly
    let mouseX = 0;
    let mouseY = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) - 0.5;
      mouseY = (e.clientY / window.innerHeight) - 0.5;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 6. Animation Loop
    let clock = new THREE.Clock();
    let animationFrameId: number;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Rotate camera based on mouse
      camera.position.x += (mouseX * 40 - camera.position.x) * 0.05;
      camera.position.y += (-mouseY * 20 + 15 - camera.position.y) * 0.05;
      camera.lookAt(0, -5, 0);

      // Animate individual cubes inside the InstancedMesh
      for (let i = 0; i < instancedCount; i++) {
        instancedMesh.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        
        // Let them rise slowly and loop back
        dummy.position.y += cubeStates[i].speed * 0.5;
        dummy.rotation.x += cubeStates[i].rotSpeed;
        dummy.rotation.y += cubeStates[i].rotSpeed;
        
        if (dummy.position.y > 15) {
          dummy.position.y = -15;
        }
        
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
      }
      instancedMesh.instanceMatrix.needsUpdate = true;

      // Subtle scene rotation
      instancedMesh.rotation.y = elapsedTime * 0.03;

      renderer.render(scene, camera);
    };

    animate();

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (renderer) renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 -z-10 w-screen h-screen pointer-events-none block" 
    />
  );
}
