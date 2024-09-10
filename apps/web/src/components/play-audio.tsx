"use client";

import { Button } from "@shallabuf/ui/button";
import { cn } from "@shallabuf/ui/cn";
import { AudioLines } from "lucide-react";

function playAudio(url: string) {
  const audio = new Audio(url);
  audio.play();
}

export type PlayAudioProps = {
  audioUrl?: string | null;
};

export const PlayAudio = (props: PlayAudioProps) => {
  return (
    <Button
      disabled={!props.audioUrl}
      variant="ghost"
      size="icon"
      onClick={() => props.audioUrl && playAudio(props.audioUrl)}
    >
      <AudioLines />
    </Button>
  );
};
