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
  const player2Ref = useRef(null);
  const frisbeeRef = useRef(null);
  const frisbee2Ref = useRef(null);
  const enemiesRef = useRef([]);
  const enemyFrisbeesRef = useRef([]);
  const obstaclesRef = useRef([]);
  const powerUpMeshesRef = useRef([]);
  const chargeArrowRef = useRef(null);

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
      hasShield: false,
      lastMoveDirection: { x: 1, z: 0 }, // Richtung in die der Spieler schaut
      currentVelocity: { x: 0, z: 0 }, // Aktuelle Bewegungsgeschwindigkeit
      meleeing: false, // Schlag-Animation
      meleeTime: 0
    },
    player2: {
      x: -10,
      z: 5,
      speed: 0.2,
      baseSpeed: 0.2,
      health: 3,
      maxHealth: 3,
      powerUps: [], // Max 3
      hasShield: false,
      lastMoveDirection: { x: 1, z: 0 },
      currentVelocity: { x: 0, z: 0 },
      meleeing: false,
      meleeTime: 0
    },
    frisbee: {
      active: false,
      x: 0,
      y: 1,
      z: 0,
      vx: 0,
      vz: 0,
      returning: false,
      speed: 0.25,
      baseSpeed: 0.25,
      color: 0x00ff00,
      startX: 0,
      startZ: 0,
      maxDistance: 6,
      baseMaxDistance: 6
    },
    frisbee2: {
      active: false,
      x: 0,
      y: 1,
      z: 0,
      vx: 0,
      vz: 0,
      returning: false,
      speed: 0.25,
      baseSpeed: 0.25,
      color: 0xff00ff,
      startX: 0,
      startZ: 0,
      maxDistance: 6,
      baseMaxDistance: 6
    },
    enemies: [
      {
        x: 16, z: -8, homeX: 16, homeZ: -8, speed: 0.12, alive: true, health: 1,
        lastMoveDirection: { x: 0, z: 1 }, territoryRadius: 10,
        patrolPoints: [{ x: 16, z: -12 }, { x: 20, z: -8 }, { x: 16, z: -4 }, { x: 12, z: -8 }],
        currentPatrolIndex: 0,
        meleeCooldown: 0
      },
      {
        x: 20, z: 4, homeX: 20, homeZ: 4, speed: 0.12, alive: true, health: 1,
        lastMoveDirection: { x: -1, z: 0 }, territoryRadius: 10,
        patrolPoints: [{ x: 20, z: 0 }, { x: 24, z: 4 }, { x: 20, z: 8 }, { x: 16, z: 4 }],
        currentPatrolIndex: 0,
        meleeCooldown: 0
      },
      {
        x: 12, z: 0, homeX: 12, homeZ: 0, speed: 0.12, alive: true, health: 1,
        lastMoveDirection: { x: 1, z: 0 }, territoryRadius: 10,
        patrolPoints: [{ x: 8, z: 0 }, { x: 12, z: 4 }, { x: 16, z: 0 }, { x: 12, z: -4 }],
        currentPatrolIndex: 0,
        meleeCooldown: 0
      }
    ],
    enemyFrisbees: [
      { active: false, x: 0, y: 1, z: 0, vx: 0, vz: 0, returning: false, speed: 0.18, color: 0xff00ff, startX: 0, startZ: 0, maxDistance: 5 },
      { active: false, x: 0, y: 1, z: 0, vx: 0, vz: 0, returning: false, speed: 0.18, color: 0xff00ff, startX: 0, startZ: 0, maxDistance: 5 },
      { active: false, x: 0, y: 1, z: 0, vx: 0, vz: 0, returning: false, speed: 0.18, color: 0xff00ff, startX: 0, startZ: 0, maxDistance: 5 }
    ],
    powerUps: [], // Spawned power-ups in arena
    score: 0
  });

  const keysPressed = useRef({});
  const gamepad1Ref = useRef(null);
  const gamepad2Ref = useRef(null);
  const gamepadButtonState = useRef({ throwButton: false, meleeButton: false });
  const gamepad2ButtonState = useRef({ throwButton: false, meleeButton: false });
  const playerFrisbeeRef = useRef(null); // Frisbee-Visual am Spieler 1
  const player2FrisbeeRef = useRef(null); // Frisbee-Visual am Spieler 2
  const enemyFrisbeeVisuals = useRef([]); // Frisbee-Visuals an Gegnern
  const meleeSwingProgress = useRef(0); // 0-1 für Schwing-Animation Player 1
  const meleeSwingProgress2 = useRef(0); // 0-1 für Schwing-Animation Player 2

  // ===== SPAWN POWER-UP =====
  const spawnPowerUp = () => {
    const types = Object.keys(POWER_UP_TYPES);
    const randomType = types[Math.floor(Math.random() * types.length)];

    // Random position in arena (4x größer)
    const x = Math.random() * 40 - 20;
    const z = Math.random() * 28 - 14;

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

      if (gameState === 'PLAYING') {
        // A-Taste oder Space: Werfen
        if (e.key === ' ' || e.key.toLowerCase() === 'a') {
          throwFrisbeeForward();
        }
        // B-Taste: Nahkampf
        if (e.key.toLowerCase() === 'b') {
          performMelee();
        }
      }

      if (gameState === 'GAME_OVER' && e.key === 'r') {
        resetGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameState, showControls, game.frisbee.active]);

  // ===== GAMEPAD SUPPORT =====
  useEffect(() => {
    const lastButtonState1 = { X: false, A: false, B: false };
    const lastButtonState2 = { X: false, A: false, B: false };

    const gamepadInterval = setInterval(() => {
      const gamepads = navigator.getGamepads();

      // Gamepad 1 (Player 1)
      if (gamepads[0]) {
        gamepad1Ref.current = gamepads[0];

        const xButtonPressed = gamepads[0].buttons[2]?.pressed;
        const aButtonPressed = gamepads[0].buttons[0]?.pressed;
        const bButtonPressed = gamepads[0].buttons[1]?.pressed;

        // Spielstart im Menü
        if (gameState === 'MENU' && xButtonPressed && !lastButtonState1.X) {
          setGameState('PLAYING');
          setTimeout(() => spawnPowerUp(), 2000);
          setTimeout(() => spawnPowerUp(), 4000);
        }

        // Neustart bei Game Over
        if (gameState === 'GAME_OVER' && xButtonPressed && !lastButtonState1.X) {
          resetGame();
        }

        // A-Button: Werfen
        if (gameState === 'PLAYING' && aButtonPressed && !lastButtonState1.A) {
          throwFrisbeeForward();
        }

        // B-Button: Nahkampf
        if (gameState === 'PLAYING' && bButtonPressed && !lastButtonState1.B) {
          performMelee();
        }

        lastButtonState1.X = xButtonPressed;
        lastButtonState1.A = aButtonPressed;
        lastButtonState1.B = bButtonPressed;
      }

      // Gamepad 2 (Player 2)
      if (gamepads[1]) {
        gamepad2Ref.current = gamepads[1];

        const xButtonPressed = gamepads[1].buttons[2]?.pressed;
        const aButtonPressed = gamepads[1].buttons[0]?.pressed;
        const bButtonPressed = gamepads[1].buttons[1]?.pressed;

        // A-Button: Werfen
        if (gameState === 'PLAYING' && aButtonPressed && !lastButtonState2.A) {
          throwFrisbeeForwardP2();
        }

        // B-Button: Nahkampf
        if (gameState === 'PLAYING' && bButtonPressed && !lastButtonState2.B) {
          performMeleeP2();
        }

        lastButtonState2.X = xButtonPressed;
        lastButtonState2.A = aButtonPressed;
        lastButtonState2.B = bButtonPressed;
      }
    }, 100);

    return () => clearInterval(gamepadInterval);
  }, [gameState, game.frisbee.active, game.frisbee2.active]);

  // ===== THREE.JS SETUP =====
  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2a2a2a);
    scene.fog = new THREE.Fog(0x2a2a2a, 40, 100); // Weiter für größere Arena
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 1000);
    camera.position.set(-10, 16, 12); // Start bei Spieler-Position (höher für größere Arena)
    camera.lookAt(-10, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(800, 600);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(20, 60, 20); // Höher für größere Arena
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Texture Loader
    const textureLoader = new THREE.TextureLoader();

    // Arena Floor with Grasland texture (4x größer)
    const graslandTexture = textureLoader.load('/assets/Grasland.png');
    graslandTexture.wrapS = THREE.RepeatWrapping;
    graslandTexture.wrapT = THREE.RepeatWrapping;
    graslandTexture.repeat.set(20, 14); // Wiederhole Textur für größere Arena

    const arenaFloor = new THREE.Mesh(
      new THREE.BoxGeometry(60, 0.5, 40),
      new THREE.MeshLambertMaterial({ map: graslandTexture })
    );
    arenaFloor.position.y = -0.25;
    arenaFloor.receiveShadow = true;
    scene.add(arenaFloor);

    // Walls
    const wallMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const northWall = new THREE.Mesh(new THREE.BoxGeometry(60, 3, 0.5), wallMaterial);
    northWall.position.set(0, 1.5, -20);
    northWall.castShadow = true;
    scene.add(northWall);

    const southWall = new THREE.Mesh(new THREE.BoxGeometry(60, 3, 0.5), wallMaterial);
    southWall.position.set(0, 1.5, 20);
    southWall.castShadow = true;
    scene.add(southWall);

    const westWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 40), wallMaterial);
    westWall.position.set(-30, 1.5, 0);
    westWall.castShadow = true;
    scene.add(westWall);

    const eastWall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 40), wallMaterial);
    eastWall.position.set(30, 1.5, 0);
    eastWall.castShadow = true;
    scene.add(eastWall);

    // Obstacles - Baum1 Sprites (weiter verteilt für größere Arena)
    obstaclesRef.current = [];
    const obstaclePositions = [
      { x: 0, z: 0 },
      { x: -10, z: -10 },
      { x: 10, z: 10 },
      { x: -10, z: 10 },
      { x: 10, z: -10 },
      { x: -15, z: 0 },
      { x: 15, z: 0 },
      { x: 0, z: -12 },
      { x: 0, z: 12 }
    ];

    const baum1Texture = textureLoader.load('/assets/Baum1.png');
    const obstacleMeshes = [];

    obstaclePositions.forEach(pos => {
      const obstacleSpriteMaterial = new THREE.SpriteMaterial({
        map: baum1Texture,
        transparent: true
      });
      const obstacleSprite = new THREE.Sprite(obstacleSpriteMaterial);
      obstacleSprite.scale.set(2.5, 3, 1); // Größer für Baum-Darstellung
      obstacleSprite.position.set(pos.x, 1.5, pos.z); // Höher positioniert
      scene.add(obstacleSprite);
      obstacleMeshes.push(obstacleSprite);
      obstaclesRef.current.push({ x: pos.x, z: pos.z, sizeX: 0.8, sizeZ: 0.4 }); // Schmale Kollisionsbox (Baumstamm)
    });

    // Player - Donut Sprite
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

    // Player Frisbee Visual (immer sichtbar, rechts vom Spieler)
    const playerFrisbeeGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
    const playerFrisbeeMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    const playerFrisbeeVisual = new THREE.Mesh(playerFrisbeeGeometry, playerFrisbeeMaterial);
    playerFrisbeeVisual.position.set(-10 + 0.6, 0.75, 0); // Rechts vom Spieler
    playerFrisbeeVisual.rotation.x = Math.PI / 2;
    playerFrisbeeVisual.castShadow = true;
    scene.add(playerFrisbeeVisual);
    playerFrisbeeRef.current = playerFrisbeeVisual;

    // Player 2 - Donut Sprite
    const player2 = new THREE.Sprite(spriteMaterial.clone());
    player2.material = new THREE.SpriteMaterial({
      map: donutTexture,
      transparent: true
    });
    player2.scale.set(1.5, 1.5, 1);
    player2.position.set(-10, 0.75, 5);
    scene.add(player2);
    player2Ref.current = player2;

    // Player 2 Frisbee Visual
    const player2FrisbeeGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
    const player2FrisbeeMaterial = new THREE.MeshLambertMaterial({ color: 0xff00ff });
    const player2FrisbeeVisual = new THREE.Mesh(player2FrisbeeGeometry, player2FrisbeeMaterial);
    player2FrisbeeVisual.position.set(-10 + 0.6, 0.75, 5);
    player2FrisbeeVisual.rotation.x = Math.PI / 2;
    player2FrisbeeVisual.castShadow = true;
    scene.add(player2FrisbeeVisual);
    player2FrisbeeRef.current = player2FrisbeeVisual;

    // Enemies - Chillybot Sprites
    const enemyPositions = [
      { x: 8, z: -4 },
      { x: 10, z: 2 },
      { x: 6, z: 0 }
    ];

    const chillybotTexture = textureLoader.load('/assets/Chillybot.png');
    enemiesRef.current = [];
    enemyFrisbeeVisuals.current = [];
    enemyPositions.forEach(() => {
      const enemySpriteMaterial = new THREE.SpriteMaterial({
        map: chillybotTexture,
        transparent: true
      });
      const enemy = new THREE.Sprite(enemySpriteMaterial);
      enemy.scale.set(1.5, 1.5, 1);
      enemy.position.y = 0.75;
      scene.add(enemy);
      enemiesRef.current.push(enemy);

      // Enemy Frisbee Visual (immer sichtbar, rechts vom Gegner)
      const enemyFrisbeeGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.08, 16);
      const enemyFrisbeeMaterial = new THREE.MeshLambertMaterial({ color: 0xff00ff });
      const enemyFrisbeeVisual = new THREE.Mesh(enemyFrisbeeGeometry, enemyFrisbeeMaterial);
      enemyFrisbeeVisual.position.y = 0.75;
      enemyFrisbeeVisual.rotation.x = Math.PI / 2;
      enemyFrisbeeVisual.castShadow = true;
      scene.add(enemyFrisbeeVisual);
      enemyFrisbeeVisuals.current.push(enemyFrisbeeVisual);
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

    // Frisbee 2 (Player 2)
    const frisbee2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 0.1, 16),
      new THREE.MeshLambertMaterial({ color: 0xff00ff })
    );
    frisbee2.visible = false;
    frisbee2.castShadow = true;
    scene.add(frisbee2);
    frisbee2Ref.current = frisbee2;

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

    setGame(prev => {
      const direction = prev.player.lastMoveDirection;
      const velocity = prev.player.currentVelocity;

      // Kombiniere Wurfgeschwindigkeit mit Spielerbewegung
      const throwVx = direction.x * prev.frisbee.speed + velocity.x;
      const throwVz = direction.z * prev.frisbee.speed + velocity.z;

      return {
        ...prev,
        frisbee: {
          ...prev.frisbee,
          active: true,
          x: prev.player.x,
          z: prev.player.z,
          startX: prev.player.x,
          startZ: prev.player.z,
          vx: throwVx,
          vz: throwVz,
          returning: false
        }
      };
    });
  };

  // ===== MELEE ATTACK =====
  const performMelee = () => {
    if (gameState !== 'PLAYING' || game.player.meleeing) return;

    // Starte Schwing-Animation
    meleeSwingProgress.current = 0;
    const swingDuration = 200; // 200ms
    const swingInterval = setInterval(() => {
      meleeSwingProgress.current += 0.1; // 10% pro Frame bei ~60fps
      if (meleeSwingProgress.current >= 1) {
        meleeSwingProgress.current = 0;
        clearInterval(swingInterval);
      }
    }, 16);

    setGame(prev => {
      const newState = { ...prev };
      newState.player.meleeing = true;
      newState.player.meleeTime = 0;

      // Prüfe Nahkampf-Treffer auf Gegner
      const meleeRange = 1.5;
      const direction = prev.player.lastMoveDirection;
      const meleeX = prev.player.x + direction.x * meleeRange;
      const meleeZ = prev.player.z + direction.z * meleeRange;

      newState.enemies = newState.enemies.map(enemy => {
        if (!enemy.alive) return enemy;
        const distance = Math.sqrt(
          (enemy.x - meleeX) ** 2 + (enemy.z - meleeZ) ** 2
        );
        if (distance < 1) {
          return { ...enemy, alive: false };
        }
        return enemy;
      });

      return newState;
    });

    // Beende Schlag-Animation nach 200ms
    setTimeout(() => {
      setGame(prev => ({
        ...prev,
        player: { ...prev.player, meleeing: false, meleeTime: 0 }
      }));
    }, swingDuration);
  };

  // ===== PLAYER 2 THROW FRISBEE =====
  const throwFrisbeeForwardP2 = () => {
    if (game.frisbee2.active || gameState !== 'PLAYING') return;

    setGame(prev => {
      const direction = prev.player2.lastMoveDirection;
      const velocity = prev.player2.currentVelocity;

      // Kombiniere Wurfgeschwindigkeit mit Spielerbewegung
      const throwVx = direction.x * prev.frisbee2.speed + velocity.x;
      const throwVz = direction.z * prev.frisbee2.speed + velocity.z;

      return {
        ...prev,
        frisbee2: {
          ...prev.frisbee2,
          active: true,
          x: prev.player2.x,
          z: prev.player2.z,
          startX: prev.player2.x,
          startZ: prev.player2.z,
          vx: throwVx,
          vz: throwVz,
          returning: false
        }
      };
    });
  };

  // ===== PLAYER 2 MELEE ATTACK =====
  const performMeleeP2 = () => {
    if (gameState !== 'PLAYING' || game.player2.meleeing) return;

    // Starte Schwing-Animation
    meleeSwingProgress2.current = 0;
    const swingDuration = 200; // 200ms
    const swingInterval = setInterval(() => {
      meleeSwingProgress2.current += 0.1;
      if (meleeSwingProgress2.current >= 1) {
        meleeSwingProgress2.current = 0;
        clearInterval(swingInterval);
      }
    }, 16);

    setGame(prev => {
      const newState = { ...prev };
      newState.player2.meleeing = true;
      newState.player2.meleeTime = 0;

      // Prüfe Nahkampf-Treffer auf Gegner
      const meleeRange = 1.5;
      const direction = prev.player2.lastMoveDirection;
      const meleeX = prev.player2.x + direction.x * meleeRange;
      const meleeZ = prev.player2.z + direction.z * meleeRange;

      newState.enemies = newState.enemies.map(enemy => {
        if (!enemy.alive) return enemy;
        const distance = Math.sqrt(
          (enemy.x - meleeX) ** 2 + (enemy.z - meleeZ) ** 2
        );
        if (distance < 1) {
          return { ...enemy, alive: false };
        }
        return enemy;
      });

      return newState;
    });

    // Beende Schlag-Animation nach 200ms
    setTimeout(() => {
      setGame(prev => ({
        ...prev,
        player2: { ...prev.player2, meleeing: false, meleeTime: 0 }
      }));
    }, swingDuration);
  };

  // ===== COLLISION =====
  const checkCollision = (obj1, obj2, radius = 1) => {
    const dx = obj1.x - obj2.x;
    const dz = obj1.z - obj2.z;
    return Math.sqrt(dx * dx + dz * dz) < radius;
  };

  // Obstacle Collision (AABB - Axis-Aligned Bounding Box)
  const checkObstacleCollision = (x, z, entityRadius = 0.5) => {
    return obstaclesRef.current.some(obstacle => {
      const halfSizeX = (obstacle.sizeX || obstacle.size || 1) / 2;
      const halfSizeZ = (obstacle.sizeZ || obstacle.size || 1) / 2;
      return (
        x + entityRadius > obstacle.x - halfSizeX &&
        x - entityRadius < obstacle.x + halfSizeX &&
        z + entityRadius > obstacle.z - halfSizeZ &&
        z - entityRadius < obstacle.z + halfSizeZ
      );
    });
  };

  // Frisbee Bounce (Reflexion an Wänden und Hindernissen)
  const handleFrisbeeBounce = (frisbee) => {
    const frisbeeRadius = 0.3;
    let bounced = false;

    // Arena-Wände (mit kleinem Puffer) - 4x größere Arena
    if (frisbee.x <= -29.5) {
      frisbee.x = -29.5;
      frisbee.vx = Math.abs(frisbee.vx); // Nach rechts abprallen
      bounced = true;
    }
    if (frisbee.x >= 29.5) {
      frisbee.x = 29.5;
      frisbee.vx = -Math.abs(frisbee.vx); // Nach links abprallen
      bounced = true;
    }
    if (frisbee.z <= -19.5) {
      frisbee.z = -19.5;
      frisbee.vz = Math.abs(frisbee.vz); // Nach unten abprallen
      bounced = true;
    }
    if (frisbee.z >= 19.5) {
      frisbee.z = 19.5;
      frisbee.vz = -Math.abs(frisbee.vz); // Nach oben abprallen
      bounced = true;
    }

    // Hindernisse (Bäume)
    obstaclesRef.current.forEach(obstacle => {
      const halfSizeX = (obstacle.sizeX || obstacle.size || 1) / 2;
      const halfSizeZ = (obstacle.sizeZ || obstacle.size || 1) / 2;
      const colliding = (
        frisbee.x + frisbeeRadius > obstacle.x - halfSizeX &&
        frisbee.x - frisbeeRadius < obstacle.x + halfSizeX &&
        frisbee.z + frisbeeRadius > obstacle.z - halfSizeZ &&
        frisbee.z - frisbeeRadius < obstacle.z + halfSizeZ
      );

      if (colliding) {
        // Berechne von welcher Seite die Frisbee kam
        const fromLeft = frisbee.x < obstacle.x;
        const fromTop = frisbee.z < obstacle.z;

        const overlapX = fromLeft
          ? (frisbee.x + frisbeeRadius) - (obstacle.x - halfSizeX)
          : (obstacle.x + halfSizeX) - (frisbee.x - frisbeeRadius);

        const overlapZ = fromTop
          ? (frisbee.z + frisbeeRadius) - (obstacle.z - halfSizeZ)
          : (obstacle.z + halfSizeZ) - (frisbee.z - frisbeeRadius);

        // Pralle in die Richtung ab, wo weniger Überlappung ist
        if (overlapX < overlapZ) {
          // Horizontal abprallen
          frisbee.vx = -frisbee.vx;
          frisbee.x = fromLeft ? obstacle.x - halfSizeX - frisbeeRadius : obstacle.x + halfSizeX + frisbeeRadius;
        } else {
          // Vertikal abprallen
          frisbee.vz = -frisbee.vz;
          frisbee.z = fromTop ? obstacle.z - halfSizeZ - frisbeeRadius : obstacle.z + halfSizeZ + frisbeeRadius;
        }
        bounced = true;
      }
    });

    return bounced;
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
        hasShield: false,
        lastMoveDirection: { x: 1, z: 0 },
        currentVelocity: { x: 0, z: 0 },
        meleeing: false,
        meleeTime: 0
      },
      player2: {
        x: -10,
        z: 5,
        speed: 0.2,
        baseSpeed: 0.2,
        health: 3,
        maxHealth: 3,
        powerUps: [],
        hasShield: false,
        lastMoveDirection: { x: 1, z: 0 },
        currentVelocity: { x: 0, z: 0 },
        meleeing: false,
        meleeTime: 0
      },
      frisbee: {
        active: false,
        x: 0,
        y: 1,
        z: 0,
        vx: 0,
        vz: 0,
        returning: false,
        speed: 0.25,
        baseSpeed: 0.25,
        color: 0x00ff00,
        startX: 0,
        startZ: 0,
        maxDistance: 6,
        baseMaxDistance: 6
      },
      frisbee2: {
        active: false,
        x: 0,
        y: 1,
        z: 0,
        vx: 0,
        vz: 0,
        returning: false,
        speed: 0.25,
        baseSpeed: 0.25,
        color: 0xff00ff,
        startX: 0,
        startZ: 0,
        maxDistance: 6,
        baseMaxDistance: 6
      },
      enemies: [
        {
          x: 16, z: -8, homeX: 16, homeZ: -8, speed: 0.12, alive: true, health: 1,
          lastMoveDirection: { x: 0, z: 1 }, territoryRadius: 10,
          patrolPoints: [{ x: 16, z: -12 }, { x: 20, z: -8 }, { x: 16, z: -4 }, { x: 12, z: -8 }],
          currentPatrolIndex: 0,
          meleeCooldown: 0
        },
        {
          x: 20, z: 4, homeX: 20, homeZ: 4, speed: 0.12, alive: true, health: 1,
          lastMoveDirection: { x: -1, z: 0 }, territoryRadius: 10,
          patrolPoints: [{ x: 20, z: 0 }, { x: 24, z: 4 }, { x: 20, z: 8 }, { x: 16, z: 4 }],
          currentPatrolIndex: 0,
          meleeCooldown: 0
        },
        {
          x: 12, z: 0, homeX: 12, homeZ: 0, speed: 0.12, alive: true, health: 1,
          lastMoveDirection: { x: 1, z: 0 }, territoryRadius: 10,
          patrolPoints: [{ x: 8, z: 0 }, { x: 12, z: 4 }, { x: 16, z: 0 }, { x: 12, z: -4 }],
          currentPatrolIndex: 0,
          meleeCooldown: 0
        }
      ],
      enemyFrisbees: [
        { active: false, x: 0, y: 1, z: 0, vx: 0, vz: 0, returning: false, speed: 0.18, color: 0xff00ff, startX: 0, startZ: 0, maxDistance: 5 },
        { active: false, x: 0, y: 1, z: 0, vx: 0, vz: 0, returning: false, speed: 0.18, color: 0xff00ff, startX: 0, startZ: 0, maxDistance: 5 },
        { active: false, x: 0, y: 1, z: 0, vx: 0, vz: 0, returning: false, speed: 0.18, color: 0xff00ff, startX: 0, startZ: 0, maxDistance: 5 }
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

        // Gamepad 1
        if (gamepad1Ref.current) {
          const axes = gamepad1Ref.current.axes;
          if (Math.abs(axes[0]) > 0.15) moveX += axes[0];
          if (Math.abs(axes[1]) > 0.15) moveZ += axes[1];
        }

        const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (length > 0) {
          moveX = (moveX / length) * newState.player.speed;
          moveZ = (moveZ / length) * newState.player.speed;

          // Speichere die Bewegungsrichtung für Frisbee-Wurf
          newState.player.lastMoveDirection = {
            x: moveX / newState.player.speed,
            z: moveZ / newState.player.speed
          };

          // Speichere aktuelle Geschwindigkeit
          newState.player.currentVelocity = { x: moveX, z: moveZ };
        } else {
          // Keine Bewegung
          newState.player.currentVelocity = { x: 0, z: 0 };
        }

        // Check obstacle collision before moving
        const newX = newState.player.x + moveX;
        const newZ = newState.player.z + moveZ;

        // Only move if not colliding with obstacles
        if (!checkObstacleCollision(newX, newZ, 0.5)) {
          newState.player.x = newX;
          newState.player.z = newZ;
        }

        newState.player.x = Math.max(-29, Math.min(29, newState.player.x));
        newState.player.z = Math.max(-19, Math.min(19, newState.player.z));

        // Check power-up collision
        newState.powerUps = newState.powerUps.filter(powerUp => {
          if (checkCollision(newState.player, powerUp, 1)) {
            // Apply PowerUp directly here instead of calling addPowerUpToPlayer
            let newPlayerPowerUps = [...newState.player.powerUps];
            const typeInfo = POWER_UP_TYPES[powerUp.type];

            // Check conflicts (Fire + Ice)
            const hasConflict = newPlayerPowerUps.some(pu => typeInfo.conflicts.includes(pu));
            if (hasConflict) {
              // Remove conflicting power-up
              newPlayerPowerUps = newPlayerPowerUps.filter(pu => !typeInfo.conflicts.includes(pu));
            }

            // Max 3 power-ups
            if (newPlayerPowerUps.length >= 3) {
              newPlayerPowerUps.shift(); // Remove oldest
            }

            newPlayerPowerUps.push(powerUp.type);

            // Apply effects to player
            newState.player.powerUps = newPlayerPowerUps;

            // Speed effect
            if (newPlayerPowerUps.includes('SPEED')) {
              newState.player.speed = newState.player.baseSpeed * 1.5;
            } else {
              newState.player.speed = newState.player.baseSpeed;
            }

            // Shield effect
            newState.player.hasShield = newPlayerPowerUps.includes('SHIELD');

            // Extra Range effect
            if (newPlayerPowerUps.includes('EXTRA_RANGE')) {
              newState.frisbee.maxDistance = newState.frisbee.baseMaxDistance * 1.5;
            } else {
              newState.frisbee.maxDistance = newState.frisbee.baseMaxDistance;
            }

            // Fire/Ice color
            if (newPlayerPowerUps.includes('FIRE')) {
              newState.frisbee.color = 0xff4500;
            } else if (newPlayerPowerUps.includes('ICE')) {
              newState.frisbee.color = 0x00bfff;
            } else {
              newState.frisbee.color = 0x00ff00;
            }

            // Spawn new power-up after delay
            setTimeout(() => spawnPowerUp(), 3000);
            return false;
          }
          return true;
        });

        // Player 2 Movement
        let move2X = 0;
        let move2Z = 0;

        // Gamepad 2
        if (gamepad2Ref.current) {
          const axes = gamepad2Ref.current.axes;
          if (Math.abs(axes[0]) > 0.15) move2X += axes[0];
          if (Math.abs(axes[1]) > 0.15) move2Z += axes[1];
        }

        const length2 = Math.sqrt(move2X * move2X + move2Z * move2Z);
        if (length2 > 0) {
          move2X = (move2X / length2) * newState.player2.speed;
          move2Z = (move2Z / length2) * newState.player2.speed;

          newState.player2.lastMoveDirection = {
            x: move2X / newState.player2.speed,
            z: move2Z / newState.player2.speed
          };

          newState.player2.currentVelocity = { x: move2X, z: move2Z };
        } else {
          newState.player2.currentVelocity = { x: 0, z: 0 };
        }

        // Check obstacle collision for player 2
        const new2X = newState.player2.x + move2X;
        const new2Z = newState.player2.z + move2Z;

        if (!checkObstacleCollision(new2X, new2Z, 0.5)) {
          newState.player2.x = new2X;
          newState.player2.z = new2Z;
        }

        newState.player2.x = Math.max(-29, Math.min(29, newState.player2.x));
        newState.player2.z = Math.max(-19, Math.min(19, newState.player2.z));

        // Enemy AI - Patrol and Territory Defense
        newState.enemies = newState.enemies.map((enemy, index) => {
          if (!enemy.alive) return enemy;

          const newEnemy = { ...enemy };
          const dxToPlayer = newState.player.x - enemy.x;
          const dzToPlayer = newState.player.z - enemy.z;
          const distanceToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dzToPlayer * dzToPlayer);

          let moveX = 0;
          let moveZ = 0;

          // Spieler in meinem Territory? Angreifen!
          if (distanceToPlayer <= enemy.territoryRadius) {
            // Nahkampf-Angriff wenn sehr nah (mit Cooldown)
            if (distanceToPlayer < 1.5 && newEnemy.meleeCooldown <= 0) {
              // Greife Spieler mit Nahkampf an
              if (newState.player.hasShield) {
                newState.player.powerUps = newState.player.powerUps.filter(p => p !== 'SHIELD');
                newState.player.hasShield = false;
              } else {
                newState.player.health -= 1;
                if (newState.player.health <= 0) {
                  setGameState('GAME_OVER');
                }
              }
              // Set cooldown: 2 seconds at 30 FPS
              newEnemy.meleeCooldown = 60;
            } else if (distanceToPlayer > 2) {
              // Bewege dich zum Spieler
              moveX = (dxToPlayer / distanceToPlayer) * enemy.speed;
              moveZ = (dzToPlayer / distanceToPlayer) * enemy.speed;
            }

            // Wirf Frisbee in Bewegungsrichtung (nur wenn nicht zu nah)
            if (!newState.enemyFrisbees[index].active && distanceToPlayer > 3 && distanceToPlayer < 8) {
              const direction = newEnemy.lastMoveDirection || { x: dxToPlayer / distanceToPlayer, z: dzToPlayer / distanceToPlayer };
              newState.enemyFrisbees[index] = {
                ...newState.enemyFrisbees[index],
                active: true,
                x: enemy.x,
                z: enemy.z,
                startX: enemy.x,
                startZ: enemy.z,
                vx: direction.x * newState.enemyFrisbees[index].speed,
                vz: direction.z * newState.enemyFrisbees[index].speed,
                returning: false
              };
            }
          } else {
            // Patrouille - Laufe zu aktuellem Wegpunkt
            const currentPoint = enemy.patrolPoints[enemy.currentPatrolIndex];
            const dxToPoint = currentPoint.x - enemy.x;
            const dzToPoint = currentPoint.z - enemy.z;
            const distanceToPoint = Math.sqrt(dxToPoint * dxToPoint + dzToPoint * dzToPoint);

            if (distanceToPoint < 0.5) {
              // Wegpunkt erreicht - gehe zum nächsten
              newEnemy.currentPatrolIndex = (enemy.currentPatrolIndex + 1) % enemy.patrolPoints.length;
            } else {
              // Bewege dich zum Wegpunkt
              moveX = (dxToPoint / distanceToPoint) * enemy.speed;
              moveZ = (dzToPoint / distanceToPoint) * enemy.speed;
            }
          }

          // Speichere Bewegungsrichtung
          const moveLength = Math.sqrt(moveX * moveX + moveZ * moveZ);
          if (moveLength > 0) {
            newEnemy.lastMoveDirection = {
              x: moveX / moveLength,
              z: moveZ / moveLength
            };
          }

          // Check obstacle collision before moving
          const newEnemyX = newEnemy.x + moveX;
          const newEnemyZ = newEnemy.z + moveZ;

          // Only move if not colliding with obstacles
          if (!checkObstacleCollision(newEnemyX, newEnemyZ, 0.5)) {
            newEnemy.x = newEnemyX;
            newEnemy.z = newEnemyZ;
          }

          // Decrement melee cooldown
          if (newEnemy.meleeCooldown > 0) {
            newEnemy.meleeCooldown--;
          }

          return newEnemy;
        });

        // Frisbee Update
        if (newState.frisbee.active) {
          if (!newState.frisbee.returning) {
            newState.frisbee.x += newState.frisbee.vx;
            newState.frisbee.z += newState.frisbee.vz;

            // Physik: Abprallen von Wänden und Hindernissen
            handleFrisbeeBounce(newState.frisbee);

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

              // Schaden auch beim Rückflug
              newState.enemies.forEach((enemy, index) => {
                if (enemy.alive && checkCollision(newState.frisbee, enemy, 1)) {
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
          }
        }

        // Frisbee 2 Update (Player 2)
        if (newState.frisbee2.active) {
          if (!newState.frisbee2.returning) {
            newState.frisbee2.x += newState.frisbee2.vx;
            newState.frisbee2.z += newState.frisbee2.vz;

            handleFrisbeeBounce(newState.frisbee2);

            const dx = newState.frisbee2.x - newState.frisbee2.startX;
            const dz = newState.frisbee2.z - newState.frisbee2.startZ;
            const distanceFromStart = Math.sqrt(dx * dx + dz * dz);

            if (distanceFromStart >= newState.frisbee2.maxDistance) {
              newState.frisbee2.returning = true;
            }

            // Enemy hit
            newState.enemies.forEach((enemy, index) => {
              if (enemy.alive && checkCollision(newState.frisbee2, enemy, 1)) {
                newState.frisbee2.returning = true;
                newState.enemies[index] = { ...enemy, alive: false };
                newState.score += 100;
              }
            });
          }

          if (newState.frisbee2.returning) {
            const dx = newState.player2.x - newState.frisbee2.x;
            const dz = newState.player2.z - newState.frisbee2.z;
            const distance = Math.sqrt(dx * dx + dz * dz);

            if (distance < 0.5) {
              newState.frisbee2.active = false;
            } else {
              newState.frisbee2.x += (dx / distance) * newState.frisbee2.speed;
              newState.frisbee2.z += (dz / distance) * newState.frisbee2.speed;

              // Schaden auch beim Rückflug
              newState.enemies.forEach((enemy, index) => {
                if (enemy.alive && checkCollision(newState.frisbee2, enemy, 1)) {
                  newState.enemies[index] = { ...enemy, alive: false };
                  newState.score += 100;
                }
              });
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

            // Physik: Abprallen von Wänden und Hindernissen
            handleFrisbeeBounce(newFrisbee);

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

              // Schaden auch beim Rückflug
              if (checkCollision(newFrisbee, newState.player, 1)) {
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

    // Player Frisbee Visual (immer sichtbar, rechts vom Spieler)
    if (playerFrisbeeRef.current && !game.frisbee.active) {
      const direction = game.player.lastMoveDirection;
      // Rechts von der Bewegungsrichtung = Perpendicular
      const rightX = -direction.z;
      const rightZ = direction.x;

      // Schwing-Animation bei Melee
      let swingOffsetX = 0;
      let swingOffsetZ = 0;
      if (game.player.meleeing && meleeSwingProgress.current > 0) {
        // Schwinge in Bewegungsrichtung (nach vorne)
        const swingDistance = Math.sin(meleeSwingProgress.current * Math.PI) * 1.2; // 0 -> 1 -> 0
        swingOffsetX = direction.x * swingDistance;
        swingOffsetZ = direction.z * swingDistance;
      }

      playerFrisbeeRef.current.position.x = game.player.x + rightX * 0.6 + swingOffsetX;
      playerFrisbeeRef.current.position.z = game.player.z + rightZ * 0.6 + swingOffsetZ;
      playerFrisbeeRef.current.material.color.setHex(game.frisbee.color);
    }
    if (playerFrisbeeRef.current && game.frisbee.active) {
      // Verstecke wenn geworfen
      playerFrisbeeRef.current.visible = false;
    } else if (playerFrisbeeRef.current) {
      playerFrisbeeRef.current.visible = true;
    }

    // Player 2
    if (player2Ref.current) {
      player2Ref.current.position.x = game.player2.x;
      player2Ref.current.position.z = game.player2.z;

      if (game.player2.hasShield) {
        player2Ref.current.material.color.setHex(0x4169e1);
      } else {
        player2Ref.current.material.color.setHex(0xffffff);
      }
    }

    // Player 2 Frisbee Visual
    if (player2FrisbeeRef.current && !game.frisbee2.active) {
      const direction = game.player2.lastMoveDirection;
      const rightX = -direction.z;
      const rightZ = direction.x;

      let swingOffsetX = 0;
      let swingOffsetZ = 0;
      if (game.player2.meleeing && meleeSwingProgress2.current > 0) {
        const swingDistance = Math.sin(meleeSwingProgress2.current * Math.PI) * 1.2;
        swingOffsetX = direction.x * swingDistance;
        swingOffsetZ = direction.z * swingDistance;
      }

      player2FrisbeeRef.current.position.x = game.player2.x + rightX * 0.6 + swingOffsetX;
      player2FrisbeeRef.current.position.z = game.player2.z + rightZ * 0.6 + swingOffsetZ;
      player2FrisbeeRef.current.material.color.setHex(game.frisbee2.color);
    }
    if (player2FrisbeeRef.current && game.frisbee2.active) {
      player2FrisbeeRef.current.visible = false;
    } else if (player2FrisbeeRef.current) {
      player2FrisbeeRef.current.visible = true;
    }

    // Kamera folgt Spieler (höher für größere Arena)
    if (cameraRef.current && playerRef.current) {
      const cameraOffset = { x: 0, y: 16, z: 12 }; // Höher und weiter weg für größere Arena
      cameraRef.current.position.x = game.player.x + cameraOffset.x;
      cameraRef.current.position.y = cameraOffset.y;
      cameraRef.current.position.z = game.player.z + cameraOffset.z;
      cameraRef.current.lookAt(game.player.x, 0, game.player.z);
    }

    game.enemies.forEach((enemy, index) => {
      if (enemiesRef.current[index]) {
        enemiesRef.current[index].position.x = enemy.x;
        enemiesRef.current[index].position.z = enemy.z;
        enemiesRef.current[index].visible = enemy.alive;
      }

      // Enemy Frisbee Visual (immer sichtbar, rechts vom Gegner)
      if (enemyFrisbeeVisuals.current[index] && !game.enemyFrisbees[index].active && enemy.alive) {
        const direction = enemy.lastMoveDirection;
        const rightX = -direction.z;
        const rightZ = direction.x;
        enemyFrisbeeVisuals.current[index].position.x = enemy.x + rightX * 0.6;
        enemyFrisbeeVisuals.current[index].position.z = enemy.z + rightZ * 0.6;
        enemyFrisbeeVisuals.current[index].visible = true;
      } else if (enemyFrisbeeVisuals.current[index]) {
        enemyFrisbeeVisuals.current[index].visible = false;
      }
    });

    if (frisbeeRef.current) {
      frisbeeRef.current.visible = game.frisbee.active;
      if (game.frisbee.active) {
        frisbeeRef.current.position.set(game.frisbee.x, game.frisbee.y, game.frisbee.z);
        frisbeeRef.current.material.color.setHex(game.frisbee.color);
      }
    }

    if (frisbee2Ref.current) {
      frisbee2Ref.current.visible = game.frisbee2.active;
      if (game.frisbee2.active) {
        frisbee2Ref.current.position.set(game.frisbee2.x, game.frisbee2.y, game.frisbee2.z);
        frisbee2Ref.current.material.color.setHex(game.frisbee2.color);
      }
    }

    game.enemyFrisbees.forEach((frisbee, index) => {
      if (enemyFrisbeesRef.current[index]) {
        enemyFrisbeesRef.current[index].visible = frisbee.active;
        if (frisbee.active) {
          enemyFrisbeesRef.current[index].position.set(frisbee.x, frisbee.y, frisbee.z);
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

        {/* ACTIVE POWER-UPS - Obere linke Ecke */}
        {gameState === 'PLAYING' && game.player.powerUps.length > 0 && (
          <div className="absolute top-4 left-4 bg-black bg-opacity-70 rounded-lg p-3 border-2 border-blue-400">
            <div className="flex gap-2">
              {game.player.powerUps.map((puType, index) => {
                const info = POWER_UP_TYPES[puType];
                return (
                  <div
                    key={index}
                    className="bg-gray-800 rounded-lg p-2 border-2 border-blue-300"
                    title={info.name}
                  >
                    <span className="text-4xl">{info.icon}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* HUD */}
      {gameState === 'PLAYING' && (
        <div className="mt-4 w-full max-w-4xl">
          <div className="flex justify-between text-white text-xl mb-2">
            <div className="bg-gray-800 px-6 py-3 rounded-lg">
              <span className="font-bold text-green-500">P1 ❤️:</span> {game.player.health}/{game.player.maxHealth}
            </div>
            <div className="bg-gray-800 px-6 py-3 rounded-lg">
              <span className="font-bold text-purple-500">P2 ❤️:</span> {game.player2.health}/{game.player2.maxHealth}
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
