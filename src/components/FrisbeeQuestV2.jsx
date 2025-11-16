import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';

// Power-Up Definitionen
const POWER_UP_TYPES = {
  FIRE: { name: 'Fire', color: 0xff4500, icon: '🔥', conflicts: ['ICE'] },
  ICE: { name: 'Ice', color: 0x00bfff, icon: '❄️', conflicts: ['FIRE'] },
  MULTI: { name: 'Multi', color: 0x9370db, icon: '✨', conflicts: [] },
  EXPLOSIVE: { name: 'Explosive', color: 0xffa500, icon: '💥', conflicts: [] },
  SPEED: { name: 'Speed', color: 0xffff00, icon: '⚡', conflicts: [] },
  SHIELD: { name: 'Shield', color: 0x4169e1, icon: '🛡️', conflicts: [] },
  EXTRA_RANGE: { name: 'Extra Range', color: 0x00ff7f, icon: '📏', conflicts: [] }
};

const FrisbeeQuestV2 = () => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const playerRef = useRef(null);
  const frisbeeRef = useRef(null);
  const enemiesRef = useRef([]);
  const enemyFrisbeesRef = useRef([]);
  const obstaclesRef = useRef([]);
  const powerUpMeshesRef = useRef([]);

  const [gameState, setGameState] = useState('MENU');
  const [showControls, setShowControls] = useState(false);

  const [game, setGame] = useState({
    player: {
      x: -10,
      z: 0,
      speed: 0.2,
      baseSpeed: 0.2,
      health: 3,
      maxHealth: 3,
      powerUps: [], // Max 3
      hasShield: false
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
      baseSpeed: 0.4,
      color: 0x00ff00,
      startX: 0,
      startZ: 0,
      maxDistance: 6,
      baseMaxDistance: 6
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
    powerUps: [], // Spawned power-ups in arena
    score: 0
  });

  const keysPressed = useRef({});
  const gamepadRef = useRef(null);

  // ===== SPAWN POWER-UP =====
  const spawnPowerUp = () => {
    const types = Object.keys(POWER_UP_TYPES);
    const randomType = types[Math.floor(Math.random() * types.length)];

    // Random position in arena
    const x = Math.random() * 20 - 10;
    const z = Math.random() * 14 - 7;

    setGame(prev => ({
      ...prev,
      powerUps: [...prev.powerUps, {
        id: Math.random(),
        type: randomType,
        x,
        z,
        rotation: 0
      }]
    }));
  };

  // ===== ADD POWER-UP TO PLAYER =====
  const addPowerUpToPlayer = (powerUpType) => {
    setGame(prev => {
      let newPowerUps = [...prev.player.powerUps];
      const typeInfo = POWER_UP_TYPES[powerUpType];

      // Check conflicts (Fire + Ice)
      const hasConflict = newPowerUps.some(pu => typeInfo.conflicts.includes(pu));
      if (hasConflict) {
        // Remove conflicting power-up
        newPowerUps = newPowerUps.filter(pu => !typeInfo.conflicts.includes(pu));
      }

      // Max 3 power-ups
      if (newPowerUps.length >= 3) {
        newPowerUps.shift(); // Remove oldest
      }

      newPowerUps.push(powerUpType);

      // Apply effects
      let newPlayer = { ...prev.player, powerUps: newPowerUps };
      let newFrisbee = { ...prev.frisbee };

      // Speed effect
      if (newPowerUps.includes('SPEED')) {
        newPlayer.speed = newPlayer.baseSpeed * 1.5;
      } else {
        newPlayer.speed = newPlayer.baseSpeed;
      }

      // Shield effect
      newPlayer.hasShield = newPowerUps.includes('SHIELD');

      // Extra Range effect
      if (newPowerUps.includes('EXTRA_RANGE')) {
        newFrisbee.maxDistance = newFrisbee.baseMaxDistance * 1.5;
      } else {
        newFrisbee.maxDistance = newFrisbee.baseMaxDistance;
      }

      // Fire/Ice color
      if (newPowerUps.includes('FIRE')) {
        newFrisbee.color = 0xff4500;
      } else if (newPowerUps.includes('ICE')) {
        newFrisbee.color = 0x00bfff;
      } else {
        newFrisbee.color = 0x00ff00;
      }

      return {
        ...prev,
        player: newPlayer,
        frisbee: newFrisbee
      };
    });
  };

  // ===== KEYBOARD INPUT =====
  useEffect(() => {
    const handleKeyDown = (e) => {
      keysPressed.current[e.key.toLowerCase()] = true;

      if (gameState === 'MENU') {
        if (e.key === 'Enter' || e.key === ' ') {
          setGameState('PLAYING');
          // Spawn initial power-ups
          setTimeout(() => spawnPowerUp(), 2000);
          setTimeout(() => spawnPowerUp(), 4000);
        }
        if (e.key.toLowerCase() === 'c') {
          setShowControls(!showControls);
        }
      }

      if (gameState === 'PLAYING' && e.key === ' ') {
        throwFrisbeeForward();
      }

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

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2a2a);
    scene.fog = new THREE.Fog(0x2a2a2a, 20, 50);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 1000);
    camera.position.set(0, 35, 15);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(800, 600);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 30, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Arena Floor
    const arenaFloor = new THREE.Mesh(
      new THREE.BoxGeometry(30, 0.5, 20),
      new THREE.MeshLambertMaterial({ color: 0x4a4a4a })
    );
    arenaFloor.position.y = -0.25;
    arenaFloor.receiveShadow = true;
    scene.add(arenaFloor);

    // Walls
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(30, 3, 0.5), wallMaterial);
    northWall.position.set(0, 1.5, -10);
    northWall.castShadow = true;
    scene.add(northWall);

    const southWall = new THREE.Mesh(new THREE.BoxGeometry(30, 3, 0.5), wallMaterial);
    southWall.position.set(0, 1.5, 10);
    southWall.castShadow = true;
    scene.add(southWall);

    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 20), wallMaterial);
    westWall.position.set(-15, 1.5, 0);
    westWall.castShadow = true;
    scene.add(westWall);

    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 20), wallMaterial);
    eastWall.position.set(15, 1.5, 0);
    eastWall.castShadow = true;
    scene.add(eastWall);

    // Obstacles
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

    // Player - Donut Sprite
    const textureLoader = new THREE.TextureLoader();
    const donutTexture = textureLoader.load('/assets/Donutplayer.png');
    const spriteMaterial = new THREE.SpriteMaterial({
      map: donutTexture,
      transparent: true
    });
    const player = new THREE.Sprite(spriteMaterial);
    player.scale.set(1.5, 1.5, 1); // Größe anpassen
    player.position.set(-10, 0.75, 0);
    scene.add(player);
    playerRef.current = player;

    // Enemies
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

    // Frisbee
    const frisbee = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16),
      new THREE.MeshLambertMaterial({ color: 0x00ff00 })
    );
    frisbee.visible = false;
    frisbee.castShadow = true;
    scene.add(frisbee);
    frisbeeRef.current = frisbee;

    // Enemy Frisbees
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

    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // ===== UPDATE POWER-UP MESHES =====
  useEffect(() => {
    if (!sceneRef.current) return;

    // Remove old power-up meshes
    powerUpMeshesRef.current.forEach(mesh => {
      sceneRef.current.remove(mesh);
    });
    powerUpMeshesRef.current = [];

    // Create new power-up meshes (blue books)
    game.powerUps.forEach(powerUp => {
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.8, 0.4),
        new THREE.MeshLambertMaterial({ color: 0x1e90ff }) // Blue
      );
      book.position.set(powerUp.x, 0.4, powerUp.z);
      book.rotation.y = powerUp.rotation;
      book.castShadow = true;
      sceneRef.current.add(book);
      powerUpMeshesRef.current.push(book);
    });
  }, [game.powerUps]);

  // ===== THROW FRISBEE =====
  const throwFrisbeeForward = () => {
    if (game.frisbee.active || gameState !== 'PLAYING') return;

    const direction = { x: 1, z: 0 };

    setGame(prev => {
      const multiCount = prev.player.powerUps.includes('MULTI') ? 3 : 1;

      // For now, just throw one frisbee (Multi can be expanded later)
      return {
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
      };
    });
  };

  // ===== COLLISION =====
  const checkCollision = (obj1, obj2, radius = 1) => {
    const dx = obj1.x - obj2.x;
    const dz = obj1.z - obj2.z;
    return Math.sqrt(dx * dx + dz * dz) < radius;
  };

  // ===== RESET GAME =====
  const resetGame = () => {
    setGame({
      player: {
        x: -10,
        z: 0,
        speed: 0.2,
        baseSpeed: 0.2,
        health: 3,
        maxHealth: 3,
        powerUps: [],
        hasShield: false
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
        baseSpeed: 0.4,
        color: 0x00ff00,
        startX: 0,
        startZ: 0,
        maxDistance: 6,
        baseMaxDistance: 6
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
      powerUps: [],
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

        // Player Movement
        const keys = keysPressed.current;
        let moveX = 0;
        let moveZ = 0;

        if (keys['w'] || keys['arrowup']) moveZ -= 1;
        if (keys['s'] || keys['arrowdown']) moveZ += 1;
        if (keys['a'] || keys['arrowleft']) moveX -= 1;
        if (keys['d'] || keys['arrowright']) moveX += 1;

        // Gamepad
        if (gamepadRef.current) {
          const axes = gamepadRef.current.axes;
          if (Math.abs(axes[0]) > 0.15) moveX += axes[0];
          if (Math.abs(axes[1]) > 0.15) moveZ += axes[1];

          if (gamepadRef.current.buttons[0]?.pressed && !newState.frisbee.active) {
            throwFrisbeeForward();
          }
        }

        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (length > 0) {
          moveX = (moveX / length) * newState.player.speed;
          moveZ = (moveZ / length) * newState.player.speed;
        }

        newState.player.x += moveX;
        newState.player.z += moveZ;

        newState.player.x = Math.max(-14, Math.min(14, newState.player.x));
        newState.player.z = Math.max(-9, Math.min(9, newState.player.z));

        // Check power-up collision
        newState.powerUps = newState.powerUps.filter(powerUp => {
          if (checkCollision(newState.player, powerUp, 1)) {
            addPowerUpToPlayer(powerUp.type);
            // Spawn new power-up after delay
            setTimeout(() => spawnPowerUp(), 3000);
            return false;
          }
          return true;
        });

        // Enemy AI
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

        // Frisbee Update
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

            // Enemy hit
            newState.enemies.forEach((enemy, index) => {
              if (enemy.alive && checkCollision(newState.frisbee, enemy, 1)) {
                newState.frisbee.returning = true;

                // Explosive effect - kill all nearby enemies
                if (newState.player.powerUps.includes('EXPLOSIVE')) {
                  newState.enemies.forEach((e, i) => {
                    if (e.alive && checkCollision(enemy, e, 3)) {
                      newState.enemies[i] = { ...e, alive: false };
                      newState.score += 100;
                    }
                  });
                } else {
                  newState.enemies[index] = { ...enemy, alive: false };
                  newState.score += 100;
                }
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

        // Enemy Frisbees
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

            // Player hit
            if (checkCollision(newFrisbee, newState.player, 1)) {
              newFrisbee.returning = true;

              // Shield blocks one hit
              if (newState.player.hasShield) {
                newState.player.powerUps = newState.player.powerUps.filter(p => p !== 'SHIELD');
                newState.player.hasShield = false;
              } else {
                newState.player.health -= 1;
                if (newState.player.health <= 0) {
                  setGameState('GAME_OVER');
                }
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

        // Win condition
        if (newState.enemies.every(e => !e.alive)) {
          setGameState('GAME_OVER');
        }

        return newState;
      });
    };

    const intervalId = setInterval(gameLoop, 1000 / 30); // 30 FPS statt 60
    return () => clearInterval(intervalId);
  }, [gameState]);

  // ===== UPDATE 3D OBJECTS =====
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.position.x = game.player.x;
      playerRef.current.position.z = game.player.z;

      // Shield visual effect (tint for sprite)
      if (game.player.hasShield) {
        playerRef.current.material.color.setHex(0x4169e1);
      } else {
        playerRef.current.material.color.setHex(0xffffff);
      }
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
        frisbeeRef.current.material.color.setHex(game.frisbee.color);
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

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4">
      <h1 className="text-4xl font-bold text-white mb-4">🥏 Frisbee Quest 3D - MVP v0.2a - wie Fu 🥏</h1>

      <div className="relative">
        <div
          ref={mountRef}
          className="border-4 border-yellow-500 rounded-lg"
          style={{ width: '800px', height: '600px' }}
        />

        {/* MENU */}
        {gameState === 'MENU' && (
          <div className="absolute inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center text-white">
            <h2 className="text-6xl font-bold mb-8 text-yellow-400">FRISBEE QUEST</h2>
            <p className="text-3xl mb-4">Drücke ENTER zum Starten</p>
            <p className="text-xl mb-8">Drücke C für Controls</p>

            {showControls && (
              <div className="bg-gray-800 p-6 rounded-lg max-w-2xl">
                <h3 className="text-2xl font-bold mb-4">🎮 STEUERUNG</h3>
                <div className="grid grid-cols-2 gap-4 text-lg mb-4">
                  <div>
                    <p className="font-bold text-yellow-400">Tastatur:</p>
                    <p>WASD - Bewegen</p>
                    <p>LEERTASTE - Frisbee werfen</p>
                  </div>
                  <div>
                    <p className="font-bold text-green-400">Xbox Controller:</p>
                    <p>Linker Stick - Bewegen</p>
                    <p>A-Button - Werfen</p>
                  </div>
                </div>
                <div className="mt-4 border-t border-gray-600 pt-4">
                  <h4 className="text-xl font-bold mb-2 text-blue-400">🎁 POWER-UPS</h4>
                  <p className="text-sm">Sammle blaue Bücher für Power-Ups!</p>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                    <p>🔥 Fire - Feuer-Frisbee</p>
                    <p>❄️ Ice - Eis-Frisbee</p>
                    <p>💥 Explosive - AoE Schaden</p>
                    <p>⚡ Speed - Schneller</p>
                    <p>🛡️ Shield - 1 Treffer blocken</p>
                    <p>📏 Extra Range - Mehr Reichweite</p>
                    <p>✨ Multi - Mehrfach-Wurf</p>
                  </div>
                  <p className="text-xs mt-2 text-gray-400">Max. 3 Power-Ups | Fire + Ice nicht kombinierbar</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GAME OVER */}
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
        <div className="mt-4 w-full max-w-4xl">
          <div className="flex justify-between text-white text-xl mb-2">
            <div className="bg-gray-800 px-6 py-3 rounded-lg">
              <span className="font-bold text-red-500">❤️ Health:</span> {game.player.health}/{game.player.maxHealth}
            </div>
            <div className="bg-gray-800 px-6 py-3 rounded-lg">
              <span className="font-bold text-yellow-400">⭐ Score:</span> {game.score}
            </div>
            <div className="bg-gray-800 px-6 py-3 rounded-lg">
              <span className="font-bold text-green-400">👾 Enemies:</span> {game.enemies.filter(e => e.alive).length}/3
            </div>
          </div>

          {/* Power-Ups Display */}
          {game.player.powerUps.length > 0 && (
            <div className="bg-gray-800 px-6 py-3 rounded-lg">
              <span className="font-bold text-blue-400">🎁 Power-Ups ({game.player.powerUps.length}/3):</span>
              <div className="flex gap-3 mt-2">
                {game.player.powerUps.map((puType, index) => {
                  const info = POWER_UP_TYPES[puType];
                  return (
                    <div key={index} className="bg-gray-700 px-3 py-1 rounded flex items-center gap-2">
                      <span className="text-2xl">{info.icon}</span>
                      <span className="text-sm">{info.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FrisbeeQuestV2;
