import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

const FrisbeeQuestV2 = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const playerRef = useRef(null);
  const frisbeeRef = useRef(null);
  const enemiesRef = useRef([]);
  const enemyFrisbeesRef = useRef([]);
  const obstaclesRef = useRef([]);

  const [gameState, setGameState] = useState('MENU'); // MENU, PLAYING, GAME_OVER
  const [showControls, setShowControls] = useState(false);

  const [game, setGame] = useState({
    player: {
      x: -10,
      z: 0,
      speed: 0.2,
      health: 3
    },
    frisbee: {
      active: false,
      x: 0,
      y: 1,
      z: 0,
      vx: 0,
      vz: 0,
      returning: false,
      speed: 0.4,
      color: 0x00ff00,
      startX: 0,
      startZ: 0,
      maxDistance: 6
    },
    enemies: [
      { x: 8, z: -4, speed: 0.12, alive: true, health: 1 },
      { x: 10, z: 2, speed: 0.12, alive: true, health: 1 },
      { x: 6, z: 0, speed: 0.12, alive: true, health: 1 }
    ],
    enemyFrisbees: [
      { active: false, x: 0, y: 1, z: 0, vx: 0, vz: 0, returning: false, speed: 0.3, color: 0xff00ff, startX: 0, startZ: 0, maxDistance: 5 },
      { active: false, x: 0, y: 1, z: 0, vx: 0, vz: 0, returning: false, speed: 0.3, color: 0xff00ff, startX: 0, startZ: 0, maxDistance: 5 },
      { active: false, x: 0, y: 1, z: 0, vx: 0, vz: 0, returning: false, speed: 0.3, color: 0xff00ff, startX: 0, startZ: 0, maxDistance: 5 }
    ],
    score: 0
  });

  const keysPressed = useRef({});
  const gamepadRef = useRef(null);

  // ===== KEYBOARD INPUT =====
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;

      // Menü Navigation
      if (gameState === 'MENU') {
        if (e.key === 'Enter' || e.key === ' ') {
          setGameState('PLAYING');
        }
        if (e.key.toLowerCase() === 'c') {
          setShowControls(!showControls);
        }
      }

      // Frisbee werfen mit Leertaste
      if (gameState === 'PLAYING' && e.key === ' ') {
        throwFrisbeeForward();
      }

      // Neustart bei Game Over
      if (gameState === 'GAME_OVER' && e.key === 'r') {
        resetGame();
      }
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
  }, [gameState, showControls]);

  // ===== GAMEPAD SUPPORT =====
  useEffect(() => {
    const gamepadInterval = setInterval(() => {
      const gamepads = navigator.getGamepads();
      if (gamepads[0]) {
        gamepadRef.current = gamepads[0];
      }
    }, 100);

    return () => clearInterval(gamepadInterval);
  }, []);

  // ===== THREE.JS SETUP =====
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2a2a);
    scene.fog = new THREE.Fog(0x2a2a2a, 20, 50);
    sceneRef.current = scene;

    // Camera (mehr von oben wie Boomerang Fu)
    const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 1000);
    camera.position.set(0, 35, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(800, 600);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 30, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);

    // ===== ARENA BODEN =====
    const arenaFloor = new THREE.Mesh(
      new THREE.BoxGeometry(30, 0.5, 20),
      new THREE.MeshLambertMaterial({ color: 0x4a4a4a })
    );
    arenaFloor.position.y = -0.25;
    arenaFloor.receiveShadow = true;
    scene.add(arenaFloor);

    // ===== ARENA WÄNDE =====
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });

    // Norden
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(30, 3, 0.5), wallMaterial);
    northWall.position.set(0, 1.5, -10);
    northWall.castShadow = true;
    scene.add(northWall);

    // Süden
    const southWall = new THREE.Mesh(new THREE.BoxGeometry(30, 3, 0.5), wallMaterial);
    southWall.position.set(0, 1.5, 10);
    southWall.castShadow = true;
    scene.add(southWall);

    // Westen
    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 20), wallMaterial);
    westWall.position.set(-15, 1.5, 0);
    westWall.castShadow = true;
    scene.add(westWall);

    // Osten
    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 20), wallMaterial);
    eastWall.position.set(15, 1.5, 0);
    eastWall.castShadow = true;
    scene.add(eastWall);

    // ===== HINDERNISSE (Boomerang Fu Stil) =====
    obstaclesRef.current = [];
    const obstaclePositions = [
      { x: 0, z: 0 },
      { x: -5, z: -5 },
      { x: 5, z: 5 },
      { x: -5, z: 5 },
      { x: 5, z: -5 }
    ];

    obstaclePositions.forEach(pos => {
      const obstacle = new THREE.Mesh(
        new THREE.BoxGeometry(2, 2, 2),
        new THREE.MeshLambertMaterial({ color: 0x8B4513 })
      );
      obstacle.position.set(pos.x, 1, pos.z);
      obstacle.castShadow = true;
      obstacle.receiveShadow = true;
      scene.add(obstacle);
      obstaclesRef.current.push({ x: pos.x, z: pos.z, size: 2 });
    });

    // ===== SPIELER (würfelförmig wie Boomerang Fu) =====
    const player = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.2, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x4a90e2 })
    );
    player.position.set(-10, 0.6, 0);
    player.castShadow = true;
    scene.add(player);
    playerRef.current = player;

    // ===== 3 GEGNER =====
    const enemyPositions = [
      { x: 8, z: -4 },
      { x: 10, z: 2 },
      { x: 6, z: 0 }
    ];

    enemiesRef.current = [];
    enemyPositions.forEach(() => {
      const enemy = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.2, 0.8),
        new THREE.MeshLambertMaterial({ color: 0xff4444 })
      );
      enemy.position.y = 0.6;
      enemy.castShadow = true;
      scene.add(enemy);
      enemiesRef.current.push(enemy);
    });

    // ===== FRISBEE =====
    const frisbee = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16),
      new THREE.MeshLambertMaterial({ color: 0x00ff00 })
    );
    frisbee.visible = false;
    frisbee.castShadow = true;
    scene.add(frisbee);
    frisbeeRef.current = frisbee;

    // ===== 3 ENEMY FRISBEES =====
    enemyFrisbeesRef.current = [];
    for (let i = 0; i < 3; i++) {
      const enemyFrisbee = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16),
        new THREE.MeshLambertMaterial({ color: 0xff00ff })
      );
      enemyFrisbee.visible = false;
      enemyFrisbee.castShadow = true;
      scene.add(enemyFrisbee);
      enemyFrisbeesRef.current.push(enemyFrisbee);
    }

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

  // ===== FRISBEE WERFEN (Vorwärts) =====
  const throwFrisbeeForward = () => {
    if (game.frisbee.active || gameState !== 'PLAYING') return;

    // Richtung: immer nach rechts werfen
    const direction = { x: 1, z: 0 };

    setGame(prev => ({
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
        returning: false
      }
    }));
  };

  // ===== KOLLISIONSERKENNUNG =====
  const checkCollision = (obj1, obj2, radius = 1) => {
    const dx = obj1.x - obj2.x;
    const dz = obj1.z - obj2.z;
    return Math.sqrt(dx * dx + dz * dz) < radius;
  };

  // ===== RESET GAME =====
  const resetGame = () => {
    setGame({
      player: { x: -10, z: 0, speed: 0.2, health: 3 },
      frisbee: {
        active: false,
        x: 0,
        y: 1,
        z: 0,
        vx: 0,
        vz: 0,
        returning: false,
        speed: 0.4,
        color: 0x00ff00,
        startX: 0,
        startZ: 0,
        maxDistance: 6
      },
      enemies: [
        { x: 8, z: -4, speed: 0.12, alive: true, health: 1 },
        { x: 10, z: 2, speed: 0.12, alive: true, health: 1 },
        { x: 6, z: 0, speed: 0.12, alive: true, health: 1 }
      ],
      enemyFrisbees: [
        { active: false, x: 0, y: 1, z: 0, vx: 0, vz: 0, returning: false, speed: 0.3, color: 0xff00ff, startX: 0, startZ: 0, maxDistance: 5 },
        { active: false, x: 0, y: 1, z: 0, vx: 0, vz: 0, returning: false, speed: 0.3, color: 0xff00ff, startX: 0, startZ: 0, maxDistance: 5 },
        { active: false, x: 0, y: 1, z: 0, vx: 0, vz: 0, returning: false, speed: 0.3, color: 0xff00ff, startX: 0, startZ: 0, maxDistance: 5 }
      ],
      score: 0
    });
    setGameState('PLAYING');
  };

  // ===== GAME LOOP =====
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const gameLoop = () => {
      setGame(prev => {
        let newState = { ...prev };

        // ===== SPIELER BEWEGUNG (Keyboard + Gamepad) =====
        const keys = keysPressed.current;
        let moveX = 0;
        let moveZ = 0;

        // Keyboard
        if (keys['w'] || keys['arrowup']) moveZ -= 1;
        if (keys['s'] || keys['arrowdown']) moveZ += 1;
        if (keys['a'] || keys['arrowleft']) moveX -= 1;
        if (keys['d'] || keys['arrowright']) moveX += 1;

        // Gamepad (Xbox Controller)
        if (gamepadRef.current) {
          const axes = gamepadRef.current.axes;
          if (Math.abs(axes[0]) > 0.15) moveX += axes[0];
          if (Math.abs(axes[1]) > 0.15) moveZ += axes[1];

          // A-Button zum Werfen
          if (gamepadRef.current.buttons[0]?.pressed && !newState.frisbee.active) {
            throwFrisbeeForward();
          }
        }

        // Normalisieren der Bewegung
        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (length > 0) {
          moveX = (moveX / length) * newState.player.speed;
          moveZ = (moveZ / length) * newState.player.speed;
        }

        newState.player.x += moveX;
        newState.player.z += moveZ;

        // Grenzen
        newState.player.x = Math.max(-14, Math.min(14, newState.player.x));
        newState.player.z = Math.max(-9, Math.min(9, newState.player.z));

        // ===== GEGNER KI =====
        newState.enemies = newState.enemies.map((enemy, index) => {
          if (!enemy.alive) return enemy;

          const newEnemy = { ...enemy };
          const dxToPlayer = newState.player.x - enemy.x;
          const dzToPlayer = newState.player.z - enemy.z;
          const distanceToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dzToPlayer * dzToPlayer);

          if (distanceToPlayer > 3) {
            newEnemy.x += (dxToPlayer / distanceToPlayer) * enemy.speed;
            newEnemy.z += (dzToPlayer / distanceToPlayer) * enemy.speed;
          }

          // Gegner wirft
          if (!newState.enemyFrisbees[index].active && distanceToPlayer < 10) {
            newState.enemyFrisbees[index] = {
              ...newState.enemyFrisbees[index],
              active: true,
              x: enemy.x,
              z: enemy.z,
              startX: enemy.x,
              startZ: enemy.z,
              vx: (dxToPlayer / distanceToPlayer) * newState.enemyFrisbees[index].speed,
              vz: (dzToPlayer / distanceToPlayer) * newState.enemyFrisbees[index].speed,
              returning: false
            };
          }

          return newEnemy;
        });

        // ===== FRISBEE UPDATE =====
        if (newState.frisbee.active) {
          if (!newState.frisbee.returning) {
            newState.frisbee.x += newState.frisbee.vx;
            newState.frisbee.z += newState.frisbee.vz;

            const dx = newState.frisbee.x - newState.frisbee.startX;
            const dz = newState.frisbee.z - newState.frisbee.startZ;
            const distanceFromStart = Math.sqrt(dx * dx + dz * dz);

            if (distanceFromStart >= newState.frisbee.maxDistance) {
              newState.frisbee.returning = true;
            }

            // Gegner treffen
            newState.enemies.forEach((enemy, index) => {
              if (enemy.alive && checkCollision(newState.frisbee, enemy, 1)) {
                newState.frisbee.returning = true;
                newState.enemies[index] = { ...enemy, alive: false };
                newState.score += 100;
              }
            });
          }

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

        // ===== ENEMY FRISBEES =====
        newState.enemyFrisbees = newState.enemyFrisbees.map((frisbee, index) => {
          if (!frisbee.active) return frisbee;

          const newFrisbee = { ...frisbee };

          if (!newFrisbee.returning) {
            newFrisbee.x += newFrisbee.vx;
            newFrisbee.z += newFrisbee.vz;

            const dx = newFrisbee.x - newFrisbee.startX;
            const dz = newFrisbee.z - newFrisbee.startZ;
            const distanceFromStart = Math.sqrt(dx * dx + dz * dz);

            if (distanceFromStart >= newFrisbee.maxDistance) {
              newFrisbee.returning = true;
            }

            // Spieler treffen
            if (checkCollision(newFrisbee, newState.player, 1)) {
              newFrisbee.returning = true;
              newState.player.health -= 1;
              if (newState.player.health <= 0) {
                setGameState('GAME_OVER');
              }
            }
          }

          if (newFrisbee.returning) {
            const dx = newState.enemies[index].x - newFrisbee.x;
            const dz = newState.enemies[index].z - newFrisbee.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < 0.5) {
              newFrisbee.active = false;
            } else {
              newFrisbee.x += (dx / distance) * newFrisbee.speed;
              newFrisbee.z += (dz / distance) * newFrisbee.speed;
            }
          }

          return newFrisbee;
        });

        // ===== WIN CONDITION =====
        if (newState.enemies.every(e => !e.alive)) {
          setGameState('GAME_OVER');
        }

        return newState;
      });
    };

    const intervalId = setInterval(gameLoop, 1000 / 60);
    return () => clearInterval(intervalId);
  }, [gameState]);

  // ===== UPDATE 3D OBJECTS =====
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.position.x = game.player.x;
      playerRef.current.position.z = game.player.z;
    }

    game.enemies.forEach((enemy, index) => {
      if (enemiesRef.current[index]) {
        enemiesRef.current[index].position.x = enemy.x;
        enemiesRef.current[index].position.z = enemy.z;
        enemiesRef.current[index].visible = enemy.alive;
      }
    });

    if (frisbeeRef.current) {
      frisbeeRef.current.visible = game.frisbee.active;
      if (game.frisbee.active) {
        frisbeeRef.current.position.set(game.frisbee.x, game.frisbee.y, game.frisbee.z);
        frisbeeRef.current.rotation.x += 0.3;
      }
    }

    game.enemyFrisbees.forEach((frisbee, index) => {
      if (enemyFrisbeesRef.current[index]) {
        enemyFrisbeesRef.current[index].visible = frisbee.active;
        if (frisbee.active) {
          enemyFrisbeesRef.current[index].position.set(frisbee.x, frisbee.y, frisbee.z);
          enemyFrisbeesRef.current[index].rotation.x += 0.3;
        }
      }
    });
  }, [game]);

  // ===== RENDER =====
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <h1 className="text-4xl font-bold text-white mb-4">🥏 Frisbee Quest 3D - MVP v0.2a - wie Fu 🥏</h1>

      <div className="relative">
        <div
          ref={mountRef}
          className="border-4 border-yellow-500 rounded-lg"
          style={{ width: '800px', height: '600px' }}
        />

        {/* MENÜ OVERLAY */}
        {gameState === 'MENU' && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-white">
            <h2 className="text-6xl font-bold mb-8 text-yellow-400">FRISBEE QUEST</h2>
            <p className="text-3xl mb-4">Drücke ENTER zum Starten</p>
            <p className="text-xl mb-8">Drücke C für Controls</p>

            {showControls && (
              <div className="bg-gray-800 p-6 rounded-lg">
                <h3 className="text-2xl font-bold mb-4">🎮 STEUERUNG</h3>
                <div className="grid grid-cols-2 gap-4 text-lg">
                  <div>
                    <p className="font-bold text-yellow-400">Tastatur:</p>
                    <p>WASD / Pfeiltasten - Bewegen</p>
                    <p>LEERTASTE - Frisbee werfen</p>
                  </div>
                  <div>
                    <p className="font-bold text-green-400">Xbox Controller:</p>
                    <p>Linker Stick - Bewegen</p>
                    <p>A-Button - Frisbee werfen</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GAME OVER OVERLAY */}
        {gameState === 'GAME_OVER' && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-white">
            {game.enemies.every(e => !e.alive) ? (
              <>
                <h2 className="text-6xl font-bold mb-4 text-yellow-400">🎉 GEWONNEN! 🎉</h2>
                <p className="text-3xl mb-4">Score: {game.score}</p>
              </>
            ) : (
              <>
                <h2 className="text-6xl font-bold mb-4 text-red-500">💀 GAME OVER 💀</h2>
                <p className="text-2xl mb-4">Du wurdest besiegt!</p>
              </>
            )}
            <p className="text-xl">Drücke R zum Neustarten</p>
          </div>
        )}
      </div>

      {/* HUD */}
      {gameState === 'PLAYING' && (
        <div className="mt-4 flex justify-between w-full max-w-4xl text-white text-xl">
          <div className="bg-gray-800 px-6 py-3 rounded-lg">
            <span className="font-bold text-red-500">❤️ Health:</span> {game.player.health}
          </div>
          <div className="bg-gray-800 px-6 py-3 rounded-lg">
            <span className="font-bold text-yellow-400">⭐ Score:</span> {game.score}
          </div>
          <div className="bg-gray-800 px-6 py-3 rounded-lg">
            <span className="font-bold text-green-400">👾 Enemies:</span> {game.enemies.filter(e => e.alive).length}/3
          </div>
        </div>
      )}
    </div>
  );
};

export default FrisbeeQuestV2;
