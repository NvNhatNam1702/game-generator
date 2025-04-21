```javascript
import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Stars, Sky, Html, useTexture } from '@react-three/drei';
import * as THREE from 'three';

// --- Game State Context ---
const GameStateContext = React.createContext();

const GameStateProvider = ({ children }) => {
    const [gameStarted, setGameStarted] = useState(false);
    const [score, setScore] = useState(0);
    const [health, setHealth] = useState(100);
    const [level, setLevel] = useState(1);
    const [gameOver, setGameOver] = useState(false);

    const startGame = () => {
        setGameStarted(true);
        setScore(0);
        setHealth(100);
        setLevel(1);
        setGameOver(false);
    };

    const resetGame = () => {
        setGameStarted(false);
        setScore(0);
        setHealth(100);
        setLevel(1);
        setGameOver(false);
    };

    const endGame = () => {
        setGameStarted(false);
        setGameOver(true);
    };

    const gameState = {
        gameStarted,
        setGameStarted,
        score,
        setScore,
        health,
        setHealth,
        level,
        setLevel,
        gameOver,
        setGameOver,
        startGame,
        resetGame,
        endGame
    };

    return (
        <GameStateContext.Provider value={gameState}>
            {children}
        </GameStateContext.Provider>
    );
};

// --- HUD Component ---
const HUD = () => {
    const { score, health, level, gameStarted } = React.useContext(GameStateContext);

    return (
        <Html position={[0, 2, -5]} center>
            <div style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '10px', borderRadius: '5px', fontFamily: 'monospace' }}>
                {gameStarted ? (
                    <>
                        <div>Score: {score}</div>
                        <div>Health: {health}</div>
                        <div>Level: {level}</div>
                    </>
                ) : (
                    <div>Press 'Space' to Start</div>
                )}
            </div>
        </Html>
    );
};


// --- Player Component ---
const Player = () => {
    const playerRef = useRef();
    const camera = useThree((state) => state.camera);
    const scene = useThree((state) => state.scene);
    const { clock } = useThree();
    const { setScore, setHealth, health, level, setLevel, gameStarted, gameOver, endGame } = React.useContext(GameStateContext);

    const moveSpeed = 0.1;
    const rotationSpeed = 0.02;
    const bulletSpeed = 0.5;
    const bulletSpread = 0.05; // Random bullet spread
    const bulletLifeTime = 3; // seconds

    const bullets = useRef([]);
    const targetsRef = useRef([]); // Ref to access targets in Player component

    const [movement, setMovement] = useState({ forward: false, backward: false, left: false, right: false });
    const [mouseRotation, setMouseRotation] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!gameStarted || gameOver) return;
            switch (e.code) {
                case 'KeyW': setMovement(m => ({ ...m, forward: true })); break;
                case 'KeyS': setMovement(m => ({ ...m, backward: true })); break;
                case 'KeyA': setMovement(m => ({ ...m, left: true })); break;
                case 'KeyD': setMovement(m => ({ ...m, right: true })); break;
                case 'Space': if (!gameStarted) {
                    const startGameEvent = new CustomEvent('startGame');
                    document.dispatchEvent(startGameEvent);
                } break;
                case 'Escape': if (gameStarted) endGame(); break;
                default: break;
            }
        };

        const handleKeyUp = (e) => {
            switch (e.code) {
                case 'KeyW': setMovement(m => ({ ...m, forward: false })); break;
                case 'KeyS': setMovement(m => ({ ...m, backward: false })); break;
                case 'KeyA': setMovement(m => ({ ...m, left: false })); break;
                case 'KeyD': setMovement(m => ({ ...m, right: false })); break;
                default: break;
            }
        };

        const handleMouseMove = (e) => {
            if (!gameStarted || gameOver) return;
            setMouseRotation({
                x: mouseRotation.x - e.movementY * rotationSpeed,
                y: mouseRotation.y - e.movementX * rotationSpeed,
            });
        };

        const handleMouseDown = () => {
            if (!gameStarted || gameOver) return;
            shoot();
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mousedown', handleMouseDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mousedown', handleMouseDown);
        };
    }, [gameStarted, gameOver, endGame, mouseRotation]);

    useEffect(() => {
        const handleStartGame = () => {
            if (!gameStarted) {
                const startGameEvent = new CustomEvent('startGame');
                document.dispatchEvent(startGameEvent);
            }
        };
        document.addEventListener('startGame', handleStartGame);
        return () => {
            document.removeEventListener('startGame', handleStartGame);
        };
    }, [gameStarted]);


    const shoot = () => {
        if (!playerRef.current || !gameStarted || gameOver) return;
        const bulletDirection = new THREE.Vector3();
        playerRef.current.getWorldDirection(bulletDirection);

        // Apply random spread
        const spreadX = (Math.random() - 0.5) * bulletSpread;
        const spreadY = (Math.random() - 0.5) * bulletSpread;
        bulletDirection.x += spreadX;
        bulletDirection.y += spreadY;
        bulletDirection.normalize();

        const bulletPosition = playerRef.current.getWorldPosition(new THREE.Vector3());
        const bullet = {
            position: bulletPosition.clone(),
            direction: bulletDirection,
            startTime: clock.getElapsedTime()
        };
        bullets.current = [...bullets.current, bullet];
    };

    useFrame(() => {
        if (!playerRef.current || !gameStarted || gameOver) return;

        // Movement
        const direction = new THREE.Vector3();
        const frontVector = new THREE.Vector3(0, 0, Number(movement.backward) - Number(movement.forward));
        const sideVector = new THREE.Vector3(Number(movement.left) - Number(movement.right), 0, 0);

        direction.subVectors(frontVector, sideVector).normalize().multiplyScalar(moveSpeed);

        playerRef.current.position.add(direction.applyQuaternion(camera.quaternion));

        // Rotation - horizontal rotation controlled by mouse Y, vertical by mouse X
        camera.rotation.x = mouseRotation.x;
        camera.rotation.y = mouseRotation.y;

        // Update bullets
        bullets.current = bullets.current.filter(bullet => {
            const bulletObject = scene.getObjectByName(`bullet-${bullets.current.indexOf(bullet)}`);
            if (bulletObject) {
                bulletObject.position.add(bullet.direction.clone().multiplyScalar(bulletSpeed));

                // Collision detection with targets
                let collision = false;
                targetsRef.current.forEach((target, index) => {
                    if (target && target.current) {
                        const targetPos = target.current.getWorldPosition(new THREE.Vector3());
                        const distance = bulletObject.position.distanceTo(targetPos);
                        if (distance < 1) { // Simple collision check, adjust radius as needed
                            collision = true;
                            // Increase score and remove target
                            setScore(s => s + 100);
                            targetsRef.current[index] = null; // Mark target for removal
                            scene.remove(target.current); // Remove target from scene
                        }
                    }
                });

                if (collision || clock.getElapsedTime() - bullet.startTime > bulletLifeTime) {
                    scene.remove(bulletObject); // Remove bullet from scene
                    return false; // Filter out bullet
                }
                return true; // Keep bullet
            }
            return false; // Filter out if object not found (shouldn't happen)
        }).map((bullet, index) => ({ ...bullet, index })); // Re-index bullets after filtering

        // Health check and game over
        if (health <= 0 && !gameOver) {
            endGame();
        }

        // Level up
        if (level < 5 && score >= level * 1000) { // Example level up condition
            setLevel(level + 1);
            // Increase game difficulty here if needed, e.g., target spawn rate, speed, etc.
        }

    });


    return (
        <>
            <mesh ref={playerRef} position={[0, 1, 5]} castShadow>
                <boxGeometry args={[1, 1, 1]} />
                <meshStandardMaterial color="blue" />
            </mesh>
            {bullets.current.map((bullet, index) => (
                <mesh key={index} name={`bullet-${index}`} position={bullet.position} castShadow>
                    <sphereGeometry args={[0.1, 12, 12]} />
                    <meshStandardMaterial color="red" />
                </mesh>
            ))}
        </>
    );
};


// --- Target Component ---
const Target = React.forwardRef((props, ref) => {
    const { position, onHit, healthPoints, targetIndex } = props;
    const [targetHealth, setTargetHealth] = useState(healthPoints || 1);
    const isHit = useRef(false);

    useEffect(() => {
        if (targetHealth <= 0 && !isHit.current) {
            isHit.current = true;
            onHit(); // Notify parent of hit
        }
    }, [targetHealth, onHit]);


    return (
        targetHealth > 0 ? (
            <mesh ref={ref} position={position} castShadow>
                <cylinderGeometry args={[0.5, 0.5, 2, 32]} />
                <meshStandardMaterial color="green" />
            </mesh>
        ) : null
    );
});


// --- Environment Component ---
const Environment = () => {
    return (
        <>
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <Sky sunPosition={[100, 10, 100]} turbidity={0.1} rayleigh={0.2} mieCoefficient={0.005} mieDirectionalG={0.7} />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[100, 100]} />
                <meshStandardMaterial color="gray" />
            </mesh>
        </>
    );
};


// --- Game Component ---
const Game = () => {
    const { startGame, gameStarted, gameOver, resetGame } = React.useContext(GameStateContext);
    const targets = useRef([]);
    const scene = useThree((state) => state.scene);

    const targetSpawnInterval = useRef(2); // Initial spawn interval (seconds)
    const lastSpawnTime = useRef(0);
    const targetCount = useRef(0);

    useEffect(() => {
        if (gameStarted && !gameOver) {
            const intervalId = setInterval(() => {
                targetSpawnInterval.current = Math.max(0.5, 2 - (targetCount.current / 10)); // Decrease interval as more targets spawned
            }, 5000); // Adjust spawn interval dynamically every 5 seconds

            return () => clearInterval(intervalId);
        }
    }, [gameStarted, gameOver]);


    useFrame(({ clock }) => {
        if (!gameStarted || gameOver) return;

        // Target spawning logic
        if (clock.getElapsedTime() - lastSpawnTime.current > targetSpawnInterval.current) {
            lastSpawnTime.current = clock.getElapsedTime();
            const x = (Math.random() - 0.5) * 50;
            const z = -50; // Spawn targets in front of player, further away
            const y = 1;
            targets.current.push({ position: [x, y, z], ref: React.createRef() });
            targetCount.current += 1;
        }

        // Remove destroyed targets
        targets.current = targets.current.filter(targetData => {
            if (targetData.ref.current && !scene.getObjectByProperty('uuid', targetData.ref.current.uuid)) {
                return false; // Filter out if target is removed from scene (destroyed)
            }
            return true; // Keep target
        });

    });

    const handleTargetHit = () => {
        // Handle target hit logic (e.g., score update is already in Player component)
    };


    return (
        <>
            <ambientLight intensity={0.5} />
            <directionalLight position={[5, 5, 5]} castShadow shadow-mapSize-height={512} shadow-mapSize-width={512} />
            <Environment />
            <Player targetsRef={targets} />
            {targets.current.map((targetData, index) => (
                <Target
                    key={index}
                    ref={targetData.ref}
                    position={targetData.position}
                    onHit={handleTargetHit}
                    targetIndex={index}
                />
            ))}
            <HUD />
            <OrbitControls enabled={!gameStarted} /> {/* Disable controls when game starts */}
            {!gameStarted && !gameOver && (
                <Html center style={{ fontFamily: 'monospace' }}>
                    <div>
                        <h1>3D Shooting Game</h1>
                        <button onClick={startGame} style={{ padding: '10px 20px', fontSize: '1.2em', cursor: 'pointer' }}>
                            Start Game (Press Space)
                        </button>
                    </div>
                </Html>
            )}
            {gameOver && (
                <Html center style={{ fontFamily: 'monospace' }}>
                    <div>
                        <h1>Game Over</h1>
                        <h2>Your Score: {React.useContext(GameStateContext).score}</h2>
                        <button onClick={resetGame} style={{ padding: '10px 20px', fontSize: '1.2em', cursor: 'pointer' }}>
                            Restart Game
                        </button>
                    </div>
                </Html>
            )}
        </>
    );
};


// --- Main App Component ---
const App = () => {
    return (
        <GameStateProvider>
            <Canvas shadows camera={{ fov: 75, near: 0.1, far: 1000, position: [0, 2, 10] }}>
                <color attach="background" args={['lightblue']} />
                <Game />
            </Canvas>
        </GameStateProvider>
    );
};

export default App;
```