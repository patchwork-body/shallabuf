"use client";
import { Button } from "@shallabuf/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shallabuf/ui/tooltip";
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

  if (!props.audioUrl) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild className={props.className}>
            <Button disabled variant="ghost" size="icon">
              <AudioLines className="animate-pulse" />
            </Button>
          </TooltipTrigger>

          <TooltipContent>Generating audio...</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      className={props.className}
    >
      {isPlaying ? <Pause /> : <AudioLines />}
    </Button>
  );
};
