import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import birdImage from "@/assets/bird.png";

interface Pipe {
  x: number;
  topHeight: number;
  gap: number;
  passed: boolean;
}

type GameState = "start" | "playing" | "gameOver";

export const FlappyGame = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>("start");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    return parseInt(localStorage.getItem("flappyHighScore") || "0");
  });

  // Game state refs
  const birdYRef = useRef(250);
  const birdVelocityRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const frameCountRef = useRef(0);
  const animationIdRef = useRef<number>();
  const birdImgRef = useRef<HTMLImageElement>();

  // Constants
  const GRAVITY = 0.5;
  const JUMP_STRENGTH = -8;
  const PIPE_WIDTH = 80;
  const PIPE_GAP = 180;
  const PIPE_SPEED = 3;
  const BIRD_SIZE = 40;
  const BIRD_X = 100;

  // Load bird image
  useEffect(() => {
    const img = new Image();
    img.src = birdImage;
    img.onload = () => {
      birdImgRef.current = img;
    };
  }, []);

  // Initialize game
  const initGame = useCallback(() => {
    birdYRef.current = 250;
    birdVelocityRef.current = 0;
    pipesRef.current = [];
    frameCountRef.current = 0;
    setScore(0);
  }, []);

  // Jump function
  const jump = useCallback(() => {
    if (gameState === "playing") {
      birdVelocityRef.current = JUMP_STRENGTH;
      playSound("jump");
    }
  }, [gameState]);

  // Play sound (placeholder - using Web Audio API)
  const playSound = (type: "jump" | "gameOver" | "score") => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === "jump") {
      oscillator.frequency.value = 400;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === "score") {
      oscillator.frequency.value = 600;
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } else if (type === "gameOver") {
      oscillator.frequency.value = 200;
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    }
  };

  // Check collision
  const checkCollision = (birdY: number, pipes: Pipe[]): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;

    // Check ground and ceiling collision
    if (birdY + BIRD_SIZE > canvas.height - 60 || birdY < 0) {
      return true;
    }

    // Check pipe collision
    for (const pipe of pipes) {
      if (
        BIRD_X + BIRD_SIZE > pipe.x &&
        BIRD_X < pipe.x + PIPE_WIDTH
      ) {
        if (birdY < pipe.topHeight || birdY + BIRD_SIZE > pipe.topHeight + pipe.gap) {
          return true;
        }
      }
    }

    return false;
  };

  // Game loop
  const gameLoop = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, "#87CEEB");
    skyGradient.addColorStop(1, "#B0E0E6");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw clouds
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(150, 80, 30, 0, Math.PI * 2);
    ctx.arc(180, 80, 40, 0, Math.PI * 2);
    ctx.arc(210, 80, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(450, 120, 35, 0, Math.PI * 2);
    ctx.arc(480, 120, 45, 0, Math.PI * 2);
    ctx.arc(520, 120, 35, 0, Math.PI * 2);
    ctx.fill();

    if (gameState === "playing") {
      // Update bird physics
      birdVelocityRef.current += GRAVITY;
      birdYRef.current += birdVelocityRef.current;

      // Spawn pipes
      frameCountRef.current++;
      if (frameCountRef.current % 120 === 0) {
        const topHeight = Math.random() * (canvas.height - PIPE_GAP - 120) + 60;
        pipesRef.current.push({
          x: canvas.width,
          topHeight,
          gap: PIPE_GAP,
          passed: false,
        });
      }

      // Update pipes
      pipesRef.current = pipesRef.current.filter((pipe) => {
        pipe.x -= PIPE_SPEED;

        // Check if bird passed pipe
        if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.passed = true;
          setScore((s) => {
            const newScore = s + 1;
            if (newScore > highScore) {
              setHighScore(newScore);
              localStorage.setItem("flappyHighScore", newScore.toString());
            }
            return newScore;
          });
          playSound("score");
        }

        return pipe.x > -PIPE_WIDTH;
      });

      // Check collision
      if (checkCollision(birdYRef.current, pipesRef.current)) {
        setGameState("gameOver");
        playSound("gameOver");
        toast.error("Game Over!", { description: `Your score: ${score}` });
        return;
      }
    }

    // Draw pipes
    pipesRef.current.forEach((pipe) => {
      // Top pipe
      const pipeGradient = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
      pipeGradient.addColorStop(0, "#2D5016");
      pipeGradient.addColorStop(0.5, "#3A6B1E");
      pipeGradient.addColorStop(1, "#2D5016");
      ctx.fillStyle = pipeGradient;
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
      ctx.fillRect(pipe.x - 5, pipe.topHeight - 30, PIPE_WIDTH + 10, 30);

      // Bottom pipe
      ctx.fillRect(pipe.x, pipe.topHeight + pipe.gap, PIPE_WIDTH, canvas.height - pipe.topHeight - pipe.gap);
      ctx.fillRect(pipe.x - 5, pipe.topHeight + pipe.gap, PIPE_WIDTH + 10, 30);

      // Pipe shine effect
      ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
      ctx.fillRect(pipe.x + 5, 0, 10, pipe.topHeight);
      ctx.fillRect(pipe.x + 5, pipe.topHeight + pipe.gap, 10, canvas.height - pipe.topHeight - pipe.gap);
    });

    // Draw ground
    const groundGradient = ctx.createLinearGradient(0, canvas.height - 60, 0, canvas.height);
    groundGradient.addColorStop(0, "#87D37C");
    groundGradient.addColorStop(1, "#5FA04E");
    ctx.fillStyle = groundGradient;
    ctx.fillRect(0, canvas.height - 60, canvas.width, 60);

    // Draw grass details
    ctx.fillStyle = "#4A8C3F";
    for (let i = 0; i < canvas.width; i += 20) {
      ctx.fillRect(i, canvas.height - 60, 10, 5);
    }

    // Draw bird
    if (birdImgRef.current) {
      ctx.save();
      ctx.translate(BIRD_X + BIRD_SIZE / 2, birdYRef.current + BIRD_SIZE / 2);
      
      // Rotate bird based on velocity
      const rotation = Math.min(Math.max(birdVelocityRef.current * 0.05, -0.5), 0.5);
      ctx.rotate(rotation);
      
      ctx.drawImage(
        birdImgRef.current,
        -BIRD_SIZE / 2,
        -BIRD_SIZE / 2,
        BIRD_SIZE,
        BIRD_SIZE
      );
      ctx.restore();
    } else {
      // Fallback circle if image not loaded
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(BIRD_X + BIRD_SIZE / 2, birdYRef.current + BIRD_SIZE / 2, BIRD_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#FFA500";
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    animationIdRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, highScore]);

  // Start game
  const startGame = () => {
    initGame();
    setGameState("playing");
    toast.success("Game Started!", { description: "Tap or click to flap!" });
  };

  // Handle click/tap
  useEffect(() => {
    const handleInteraction = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      if (gameState === "playing") {
        jump();
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("click", handleInteraction);
      canvas.addEventListener("touchstart", handleInteraction);

      return () => {
        canvas.removeEventListener("click", handleInteraction);
        canvas.removeEventListener("touchstart", handleInteraction);
      };
    }
  }, [gameState, jump]);

  // Handle keyboard
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" && gameState === "playing") {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameState, jump]);

  // Start/stop game loop
  useEffect(() => {
    if (gameState === "playing" || gameState === "gameOver") {
      animationIdRef.current = requestAnimationFrame(gameLoop);
    }

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [gameState, gameLoop]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted p-4">
      {/* Score Display */}
      {gameState === "playing" && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10 animate-bounce-in">
          <div className="text-6xl font-bold text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.3)]">
            {score}
          </div>
        </div>
      )}

      {/* High Score */}
      {gameState !== "playing" && (
        <div className="absolute top-4 right-4 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg">
          <div className="text-sm text-muted-foreground">High Score</div>
          <div className="text-2xl font-bold text-primary">{highScore}</div>
        </div>
      )}

      {/* Canvas */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={500}
          className="rounded-2xl shadow-2xl border-4 border-primary/20 max-w-full h-auto"
          style={{ touchAction: "none" }}
        />

        {/* Start Screen Overlay */}
        {gameState === "start" && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-8 animate-fade-in">
            <div className="text-center space-y-4 animate-float">
              <h1 className="text-6xl font-bold text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                Flappy Bird
              </h1>
              <p className="text-xl text-white/90">Tap or Click to Flap!</p>
            </div>
            <Button
              onClick={startGame}
              size="lg"
              className="text-2xl px-12 py-6 rounded-full shadow-xl animate-bounce-in bg-secondary text-secondary-foreground hover:scale-110 transition-transform"
            >
              Play Game
            </Button>
          </div>
        )}

        {/* Game Over Screen Overlay */}
        {gameState === "gameOver" && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-6 animate-slide-up">
            <div className="bg-card/90 backdrop-blur-md rounded-3xl p-8 shadow-2xl text-center space-y-4 border-4 border-destructive/30">
              <h2 className="text-5xl font-bold text-destructive">Game Over!</h2>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-foreground">Score: {score}</div>
                {score === highScore && score > 0 && (
                  <div className="text-lg text-secondary font-semibold animate-bounce-in">
                    🏆 New High Score! 🏆
                  </div>
                )}
              </div>
            </div>
            <Button
              onClick={startGame}
              size="lg"
              className="text-2xl px-12 py-6 rounded-full shadow-xl bg-primary text-primary-foreground hover:scale-110 transition-transform"
            >
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 text-center space-y-2">
        <p className="text-lg text-muted-foreground">
          🖱️ Click, 👆 Tap, or ⌨️ Press Space to flap
        </p>
        <p className="text-sm text-muted-foreground">Avoid the pipes and beat your high score!</p>
      </div>
    </div>
  );
};
