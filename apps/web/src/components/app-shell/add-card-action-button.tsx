"use client";
import { createCard } from "@/actions/cards/create";
import { Button } from "@shallabuf/ui/button";
import { Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export const AddCardActionButton = () => {
  const [imageSrc, setImageSrc] = useState("");
  const { execute, isPending, hasSucceeded } = useAction(createCard);
  const params = useParams();

  const getImage = async () => {
    const apiResponse = await fetch("/api/text-to-image", {
      method: "POST",
      headers: {
        "Content-Type": "text/event-stream",
      },
      body: JSON.stringify({
        text: "disrupting factor",
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
        jsonString += value;
      }
    }

    try {
      const b64_json = JSON.parse(jsonString).data[0].b64_json;

      console.log("Image:", b64_json);
      setImageSrc(`data:image/png;base64,${b64_json}`);
    } catch (error) {
      console.error("Error decoding image:", error);
    }
  };

  useEffect(() => {
    if (hasSucceeded) {
      getImage();
    }
  }, [hasSucceeded]);

  return (
    <div>
      <Button
        size="icon"
        disabled={isPending}
        aria-label="Add new card"
        onClick={async () => {
          execute({
            front: "disrupting factor",
            back: "possum",
            deckId: params.id as string,
          });
        }}
      >
        <Plus />
      </Button>

      {imageSrc && <img src={imageSrc} alt="Generated" />}
    </div>
  );
};
