import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

const FrisbeeQuest = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const playerRef = useRef(null);
  const frisbeeRef = useRef(null);
  const chestRef = useRef(null);
  const enemyRef = useRef(null);
  const enemyFrisbeeRef = useRef(null);

  const [gameState, setGameState] = useState({
    player: {
      x: -15,
      z: 0,
      speed: 0.15
    },
    frisbee: {
      active: false,
      x: 0,
      y: 1,
      z: 0,
      vx: 0,
      vz: 0,
      returning: false,
      speed: 0.3,
      color: 0x00ff00, // Grün
      startX: 0,
      startZ: 0,
      maxDistance: 5 // Maximale Flugdistanz in Metern
    },
    enemy: {
      x: 5,
      z: -3,
      speed: 0.1, // Langsamer als Spieler
      lastThrowTime: 0,
      throwCooldown: 3000, // 3 Sekunden zwischen Würfen
      alive: true
    },
    enemyFrisbee: {
      active: false,
      x: 0,
      y: 1,
      z: 0,
      vx: 0,
      vz: 0,
      returning: false,
      speed: 0.25,
      color: 0xff00ff, // Magenta
      startX: 0,
      startZ: 0,
      maxDistance: 4 // Etwas kürzer als Spieler
    },
    chest: {
      x: 0,
      z: 0,
      opened: false
    },
    goal: {
      x: 15,
      z: 0
    },
    skillUnlocked: false,
    levelComplete: false,
    playerHit: false
  });

  const keysPressed = useRef({});

  // ===== KEYBOARD INPUT =====
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ===== THREE.JS SETUP =====
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    sceneRef.current = scene;

    // Camera (schräg von oben)
    const camera = new THREE.PerspectiveCamera(
      60,
      800 / 600,
      0.1,
      1000
    );
    camera.position.set(0, 25, 20);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(800, 600);
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    // ===== LEVEL RÄUME =====
    // Eingang
    const entrance = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.5, 8),
      new THREE.MeshLambertMaterial({ color: 0x90ee90 })
    );
    entrance.position.set(-15, 0, 0);
    scene.add(entrance);

    // Hauptraum
    const mainRoom = new THREE.Mesh(
      new THREE.BoxGeometry(14, 0.5, 12),
      new THREE.MeshLambertMaterial({ color: 0x98fb98 })
    );
    mainRoom.position.set(0, 0, 0);
    scene.add(mainRoom);

    // Zielraum
    const goalRoom = new THREE.Mesh(
      new THREE.BoxGeometry(10, 0.5, 8),
      new THREE.MeshLambertMaterial({ color: 0xadff2f })
    );
    goalRoom.position.set(15, 0, 0);
    scene.add(goalRoom);

    // ===== SPIELER =====
    const player = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.5, 4),
      new THREE.MeshLambertMaterial({ color: 0x4a90e2 })
    );
    player.position.set(-15, 1, 0);
    player.rotation.y = Math.PI / 4;
    scene.add(player);
    playerRef.current = player;

    // ===== GEGNER =====
    const enemy = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 1.5, 4),
      new THREE.MeshLambertMaterial({ color: 0xff4444 }) // Rot
    );
    enemy.position.set(5, 1, -3);
    enemy.rotation.y = Math.PI / 4;
    scene.add(enemy);
    enemyRef.current = enemy;

    // ===== TRUHE =====
    const chest = new THREE.Group();
    const chestBody = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.8, 1),
      new THREE.MeshLambertMaterial({ color: 0x8b4513 })
    );
    chestBody.position.y = 0.65;
    chest.add(chestBody);
    chest.position.set(0, 0, 0);
    scene.add(chest);
    chestRef.current = chest;

    // ===== ZIEL =====
    const goal = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 1.5, 8),
      new THREE.MeshLambertMaterial({ color: 0xffd700 })
    );
    goal.position.set(15, 1, 0);
    scene.add(goal);

    // ===== FRISBEE =====
    const frisbee = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16),
      new THREE.MeshLambertMaterial({ color: 0x00ff00 })
    );
    frisbee.visible = false;
    scene.add(frisbee);
    frisbeeRef.current = frisbee;

    // ===== ENEMY FRISBEE =====
    const enemyFrisbee = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16),
      new THREE.MeshLambertMaterial({ color: 0xff00ff }) // Magenta
    );
    enemyFrisbee.visible = false;
    scene.add(enemyFrisbee);
    enemyFrisbeeRef.current = enemyFrisbee;

    // ===== ANIMATION LOOP =====
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // ===== CLEANUP =====
    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // ===== FRISBEE WERFEN =====
  const throwFrisbee = (e) => {
    if (gameState.frisbee.active || !playerRef.current) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Richtung basierend auf Mausklick
    const direction = new THREE.Vector3(x * 2, 0, -y * 2).normalize();

    setGameState(prev => ({
      ...prev,
      frisbee: {
        ...prev.frisbee,
        active: true,
        x: prev.player.x,
        z: prev.player.z,
        startX: prev.player.x,
        startZ: prev.player.z,
        vx: direction.x * prev.frisbee.speed,
        vz: direction.z * prev.frisbee.speed,
        returning: false,
        color: prev.skillUnlocked ? 0xff0000 : 0x00ff00 // Rot wenn Skill unlocked, sonst Grün
      }
    }));
  };

  // ===== KOLLISIONSERKENNUNG =====
  const checkCollision = (obj1, obj2, radius = 1) => {
    const dx = obj1.x - obj2.x;
    const dz = obj1.z - obj2.z;
    return Math.sqrt(dx * dx + dz * dz) < radius;
  };

  // ===== GAME LOOP =====
  useEffect(() => {
    const gameLoop = () => {
      setGameState(prev => {
        let newState = { ...prev };

        // Spieler Bewegung
        const keys = keysPressed.current;
        if (keys['w'] || keys['arrowup']) newState.player.z -= newState.player.speed;
        if (keys['s'] || keys['arrowdown']) newState.player.z += newState.player.speed;
        if (keys['a'] || keys['arrowleft']) newState.player.x -= newState.player.speed;
        if (keys['d'] || keys['arrowright']) newState.player.x += newState.player.speed;

        // Grenzen
        newState.player.x = Math.max(-20, Math.min(20, newState.player.x));
        newState.player.z = Math.max(-6, Math.min(6, newState.player.z));

        // SPIELER durch TRUHE laufen - Skill einsammeln
        if (!newState.chest.opened && checkCollision(newState.player, newState.chest, 1.2)) {
          newState.chest.opened = true;
          newState.skillUnlocked = true;
        }

        // ===== GEGNER KI =====
        if (newState.enemy.alive) {
          // Bewegt sich langsam in Richtung Spieler
          const dxToPlayer = newState.player.x - newState.enemy.x;
          const dzToPlayer = newState.player.z - newState.enemy.z;
          const distanceToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dzToPlayer * dzToPlayer);

          if (distanceToPlayer > 3) { // Hält Abstand von 3 Einheiten
            newState.enemy.x += (dxToPlayer / distanceToPlayer) * newState.enemy.speed;
            newState.enemy.z += (dzToPlayer / distanceToPlayer) * newState.enemy.speed;
          }

          // Gegner wirft Frisbee in Richtung Spieler
          const currentTime = Date.now();
          if (!newState.enemyFrisbee.active &&
              currentTime - newState.enemy.lastThrowTime > newState.enemy.throwCooldown &&
              distanceToPlayer < 10) { // Wirft nur wenn Spieler in Reichweite

            const throwDirection = {
              x: dxToPlayer / distanceToPlayer,
              z: dzToPlayer / distanceToPlayer
            };

            newState.enemyFrisbee = {
              ...newState.enemyFrisbee,
              active: true,
              x: newState.enemy.x,
              z: newState.enemy.z,
              startX: newState.enemy.x,
              startZ: newState.enemy.z,
              vx: throwDirection.x * newState.enemyFrisbee.speed,
              vz: throwDirection.z * newState.enemyFrisbee.speed,
              returning: false
            };

            newState.enemy.lastThrowTime = currentTime;
          }
        }

        // Frisbee Update (Spieler)
        if (newState.frisbee.active) {
          if (!newState.frisbee.returning) {
            newState.frisbee.x += newState.frisbee.vx;
            newState.frisbee.z += newState.frisbee.vz;

            // Distanz vom Startpunkt berechnen
            const dx = newState.frisbee.x - newState.frisbee.startX;
            const dz = newState.frisbee.z - newState.frisbee.startZ;
            const distanceFromStart = Math.sqrt(dx * dx + dz * dz);

            // Wenn maximale Distanz erreicht, zurückkommen
            if (distanceFromStart >= newState.frisbee.maxDistance) {
              newState.frisbee.returning = true;
            }

            // Außerhalb Spielfeld
            if (Math.abs(newState.frisbee.x) > 25 || Math.abs(newState.frisbee.z) > 10) {
              newState.frisbee.returning = true;
            }

            // Gegner treffen
            if (newState.enemy.alive && checkCollision(newState.frisbee, newState.enemy, 1)) {
              newState.frisbee.returning = true;
              newState.enemy.alive = false; // Gegner stirbt
            }
          }

          // Zurück zum Spieler
          if (newState.frisbee.returning) {
            const dx = newState.player.x - newState.frisbee.x;
            const dz = newState.player.z - newState.frisbee.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < 0.5) {
              newState.frisbee.active = false;
            } else {
              newState.frisbee.x += (dx / distance) * newState.frisbee.speed;
              newState.frisbee.z += (dz / distance) * newState.frisbee.speed;
            }
          }
        }

        // Enemy Frisbee Update
        if (newState.enemyFrisbee.active) {
          if (!newState.enemyFrisbee.returning) {
            newState.enemyFrisbee.x += newState.enemyFrisbee.vx;
            newState.enemyFrisbee.z += newState.enemyFrisbee.vz;

            // Distanz vom Startpunkt berechnen
            const dx = newState.enemyFrisbee.x - newState.enemyFrisbee.startX;
            const dz = newState.enemyFrisbee.z - newState.enemyFrisbee.startZ;
            const distanceFromStart = Math.sqrt(dx * dx + dz * dz);

            // Wenn maximale Distanz erreicht, zurückkommen
            if (distanceFromStart >= newState.enemyFrisbee.maxDistance) {
              newState.enemyFrisbee.returning = true;
            }

            // Außerhalb Spielfeld
            if (Math.abs(newState.enemyFrisbee.x) > 25 || Math.abs(newState.enemyFrisbee.z) > 10) {
              newState.enemyFrisbee.returning = true;
            }

            // Spieler treffen
            if (checkCollision(newState.enemyFrisbee, newState.player, 1)) {
              newState.enemyFrisbee.returning = true;
              newState.playerHit = true;
            }
          }

          // Zurück zum Gegner
          if (newState.enemyFrisbee.returning) {
            const dx = newState.enemy.x - newState.enemyFrisbee.x;
            const dz = newState.enemy.z - newState.enemyFrisbee.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < 0.5) {
              newState.enemyFrisbee.active = false;
            } else {
              newState.enemyFrisbee.x += (dx / distance) * newState.enemyFrisbee.speed;
              newState.enemyFrisbee.z += (dz / distance) * newState.enemyFrisbee.speed;
            }
          }
        }

        // Ziel erreichen
        if (checkCollision(newState.player, newState.goal, 2)) {
          newState.levelComplete = true;
        }

        return newState;
      });
    };

    const intervalId = setInterval(gameLoop, 1000 / 60);
    return () => clearInterval(intervalId);
  }, []);

  // ===== UPDATE 3D OBJECTS =====
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.position.x = gameState.player.x;
      playerRef.current.position.z = gameState.player.z;
    }

    if (enemyRef.current) {
      enemyRef.current.position.x = gameState.enemy.x;
      enemyRef.current.position.z = gameState.enemy.z;
      enemyRef.current.visible = gameState.enemy.alive; // Unsichtbar wenn tot
    }

    if (frisbeeRef.current) {
      frisbeeRef.current.visible = gameState.frisbee.active;
      if (gameState.frisbee.active) {
        frisbeeRef.current.position.set(
          gameState.frisbee.x,
          gameState.frisbee.y,
          gameState.frisbee.z
        );
        frisbeeRef.current.rotation.x += 0.3;
        frisbeeRef.current.material.color.setHex(gameState.frisbee.color);
      }
    }

    if (enemyFrisbeeRef.current) {
      enemyFrisbeeRef.current.visible = gameState.enemyFrisbee.active;
      if (gameState.enemyFrisbee.active) {
        enemyFrisbeeRef.current.position.set(
          gameState.enemyFrisbee.x,
          gameState.enemyFrisbee.y,
          gameState.enemyFrisbee.z
        );
        enemyFrisbeeRef.current.rotation.x += 0.3;
        enemyFrisbeeRef.current.material.color.setHex(gameState.enemyFrisbee.color);
      }
    }

    if (chestRef.current && gameState.chest.opened) {
      chestRef.current.children[0].material.color.setHex(0xdeb887);
    }
  }, [gameState]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 p-4">
      <h1 className="text-3xl font-bold text-white mb-4">Frisbee Quest 3D - MVP v0.1a - mit Gegner</h1>
      <div
        ref={mountRef}
        onClick={throwFrisbee}
        className="border-4 border-gray-600 cursor-crosshair"
        style={{ width: '800px', height: '600px' }}
      />
      <div className="mt-4 text-white text-center space-y-2">
        <p className="font-bold">WASD - Bewegung | Linksklick - Frisbee werfen</p>
        {gameState.skillUnlocked && (
          <p className="text-red-500 font-bold text-xl">🔥 Feuer eingesammelt! 🔥</p>
        )}
        {gameState.playerHit && (
          <p className="text-orange-500 font-bold text-lg">⚠️ Von Gegner getroffen! ⚠️</p>
        )}
        {!gameState.enemy.alive && (
          <p className="text-green-500 font-bold text-xl">💀 Gegner besiegt! 💀</p>
        )}
        {gameState.levelComplete && (
          <p className="text-yellow-400 text-2xl font-bold">🎉 LEVEL GESCHAFFT! 🎉</p>
        )}
      </div>
    </div>
  );
};

export default FrisbeeQuest;
