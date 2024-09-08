"use client";
import { useParams, usePathname } from "next/navigation";
import { AddCardActionButton } from "./add-card-action-button";
import { AddDeckActionButton } from "./add-deck-action-button";

export const ActionButton = () => {
  const pathname = usePathname();
  const params = useParams();

  if (pathname === "/decks") {
    return <AddDeckActionButton />;
  }

  if (pathname === `/decks/${params.id}`) {
    return <AddCardActionButton />;
  }

  return null;
};
