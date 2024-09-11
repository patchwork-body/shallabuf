"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export type StreamProps = {
  cardId: string;
};

export const Stream = ({ cardId }: StreamProps) => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const params = useParams();

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

      if (done) {
        break;
      }

      if (value) {
        console.log(JSON.parse(value));
        jsonString += value;
      }
    }
  };

  useEffect(() => {
    if (!isSubscribed) {
      startStream();
      setIsSubscribed(true);
    }
  }, [isSubscribed]);

  return <></>;
};
