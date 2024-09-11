"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export type StreamProps = {
  cardId: string;
};

export const Stream = ({ cardId }: StreamProps) => {
  const startStream = async () => {
    const apiResponse = await fetch("/api/streams/card-changes", {
      method: "POST",
      headers: {
        "Content-Type": "Application/json",
      },
      body: JSON.stringify({
        cardId,
      }),
    });

    if (!apiResponse.body) return;

    // To decode incoming data as a string
    const reader = apiResponse.body
      .pipeThrough(new TextDecoderStream())
      .getReader();

    let jsonString = "";

    while (true) {
      const { value, done } = await reader.read();
      console.log(value);

      if (done) {
        break;
      }

      if (value) {
        jsonString += value;
      }
    }
  };

  useEffect(() => {
    startStream();
  }, []);

  return <></>;
};
