import { FlappyGame } from "@/components/FlappyGame";
import { Helmet } from "react-helmet";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Flappy Bird Game - Fun Arcade Game</title>
        <meta name="description" content="Play the classic Flappy Bird game! Tap to flap and avoid the pipes in this fun, addictive arcade game. Challenge yourself and beat your high score!" />
      </Helmet>
      <FlappyGame />
    </>
  );
};

export default Index;
