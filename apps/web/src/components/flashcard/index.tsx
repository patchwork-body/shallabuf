"use client";
import { animated, useSpring } from "@react-spring/web";
import { logger } from "@shallabuf/logger";
import type { Card as CardType } from "@shallabuf/turso/schema";
import { Badge } from "@shallabuf/ui/badge";
import { Button } from "@shallabuf/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@shallabuf/ui/card";
import { cn } from "@shallabuf/ui/cn";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@shallabuf/ui/tooltip";
import { FlipHorizontal } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { EditCardDialog } from "./edit-card-dialog";
import { PlayAudio } from "./play-audio";

function useStream<T>(cardId: string, callback: (patch: T) => void) {
  const [streamStarted, setStreamStarted] = useState(false);
  const abortController = useRef(new AbortController());

  const start = useCallback(async () => {
    if (streamStarted) return;
    setStreamStarted(true);

    const apiResponse = await fetch(`/api/streams/card-changes/${cardId}`, {
      method: "GET",
      signal: abortController.current.signal,
    });

    if (!apiResponse.body) return;

    // To decode incoming data as a string
    const reader = apiResponse.body
      .pipeThrough(new TextDecoderStream())
      .getReader();

    let outputJson = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      if (value) {
        outputJson += value;
      }

      try {
        const output = JSON.parse(outputJson);
        logger.info("Card changed", output);
        callback(output);
        outputJson = "";
      } catch (error) {
        logger.error("Failed to parse JSON", error);
      }
    }
  }, [cardId, streamStarted, callback, setStreamStarted]);

  return {
    start,
  };
}

type StreamOutput =
  | {
      image: string;
    }
  | {
      frontAudio: string;
    }
  | {
      backAudio: string;
    };

export type FlashcardProps = {
  card: CardType;
};

export const Flashcard = ({ card }: FlashcardProps) => {
  const [patchedCard, setPatchedCard] = useState(card);

  const stream = useStream<StreamOutput>(card.id, (patch) => {
    setPatchedCard((prev) => ({ ...prev, ...patch }));
  });

  const [isFlipped, setIsFlipped] = useState(false);

  const spring = useSpring({
    from: { transform: "rotateY(0deg)" },
    to: {
      transform: `rotateY(${isFlipped ? 180 : 0}deg)`,
    },
    config: { tension: 300, friction: 20 },
  });

  const handleFlip = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, [setIsFlipped]);

  useEffect(() => {
    if (
      !patchedCard.backAudio ||
      !patchedCard.frontAudio ||
      !patchedCard.image
    ) {
      stream.start();
    }
  }, [
    patchedCard.backAudio,
    patchedCard.frontAudio,
    patchedCard.image,
    stream,
  ]);

  return (
    <animated.div style={spring}>
      <Card
        className="group relative h-[196px] flex flex-col justify-between"
        style={{ transform: isFlipped ? "rotateY(180deg)" : "" }}
      >
        <CardHeader className="flex flex-row items-center justify-between">
          {patchedCard.image ? (
            <div
              className={cn(
                "absolute z-10 transition-width-height-border-margin m-5 top-0 left-0 h-12 w-12 bg-cover bg-center rounded-full border-border border-2 bg-secondary",
                "hover:m-2 hover:h-[calc(100%-15px)] hover:w-[calc(100%-15px)] hover:rounded-lg",
              )}
              style={{ backgroundImage: `url(${patchedCard.image})` }}
            />
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "absolute z-10 transition-width-height-border-margin m-5 top-0 left-0 h-12 w-12",
                      "bg-cover bg-center rounded-full border-border border-2 bg-secondary animate-pulse",
                    )}
                  />
                </TooltipTrigger>

                <TooltipContent>Generating image...</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {isFlipped ? (
            <PlayAudio className="ml-auto" audioUrl={patchedCard.backAudio} />
          ) : (
            <PlayAudio className="ml-auto" audioUrl={patchedCard.frontAudio} />
          )}
        </CardHeader>

        <CardContent className="text-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="truncate">
                  {isFlipped ? patchedCard.back : patchedCard.front}
                </p>
              </TooltipTrigger>

              <TooltipContent>
                {isFlipped ? patchedCard.back : patchedCard.front}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardContent>

        <CardFooter className="justify-between">
          <Badge variant="secondary">{isFlipped ? "Back" : "Front"}</Badge>
          <EditCardDialog card={patchedCard} onCardUpdate={setPatchedCard} />
        </CardFooter>

        <Button
          variant="secondary"
          className={cn(
            "flex gap-x-2 items-center absolute bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100",
            "transition-opacity bg-secondary/50 text-secondary-foreground rounded-lg px-3 py-2",
          )}
          onClick={handleFlip}
        >
          <FlipHorizontal />
          Flip card
        </Button>
      </Card>
    </animated.div>
  );
};
