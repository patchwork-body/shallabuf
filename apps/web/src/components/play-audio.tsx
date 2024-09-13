"use client";

import { Button } from "@shallabuf/ui/button";
import { AudioLines, Pause } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export type PlayAudioProps = {
  className?: string;
  audioUrl?: string | null;
};

export const PlayAudio = (props: PlayAudioProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioInstance, setAudioInstance] = useState<HTMLAudioElement | null>(
    null,
  );

  const resetAudio = useCallback(() => {
    if (audioInstance) {
      audioInstance.pause();
      audioInstance.currentTime = 0;
    }
  }, [audioInstance]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
  }, [setIsPlaying]);

  useEffect(() => {
    if (props.audioUrl) {
      setAudioInstance(new Audio(props.audioUrl));
    }
  }, [setAudioInstance, props.audioUrl]);

  useEffect(() => {
    if (audioInstance) {
      audioInstance.addEventListener("ended", handleEnded);

      return () => {
        handleEnded();
        resetAudio();
        audioInstance.removeEventListener("ended", handleEnded);
      };
    }
  }, [audioInstance, resetAudio, handleEnded]);

  const handleClick = useCallback(() => {
    if (!audioInstance) {
      return;
    }

    if (isPlaying) {
      resetAudio();
      handleEnded();
    }

    if (!isPlaying) {
      audioInstance.play();
      setIsPlaying(true);
    }
  }, [
    isPlaying,
    audioInstance,
    resetAudio,
    setAudioInstance,
    setIsPlaying,
    handleEnded,
  ]);

  return (
    <Button
      disabled={!props.audioUrl}
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={props.className}
    >
      {isPlaying ? <Pause /> : <AudioLines />}
    </Button>
  );
};
