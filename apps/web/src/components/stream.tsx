"use client";
import { logger } from "@shallabuf/logger";
import { useEffect } from "react";

export type StreamProps = {
  cardId: string;
};

export const Stream = ({ cardId }: StreamProps) => {
  const startStream = async () => {
    const apiResponse = await fetch(
      `/api/streams/card-changes?cardId=${cardId}`,
      { method: "GET" },
    );

    if (!apiResponse.body) return;

    // To decode incoming data as a string
    const reader = apiResponse.body
      .pipeThrough(new TextDecoderStream())
      .getReader();

    let jsonString = "";

    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      if (value) {
        jsonString += value;
      }

      try {
        const card = JSON.parse(jsonString);
        logger.info("Card changed", card);
        jsonString = "";
      } catch (error) {
        logger.error("Failed to parse JSON", error);
      }
    }
  };

  useEffect(() => {
    startStream();
  }, []);

  return <></>;
};
