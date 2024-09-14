"use client";
import { useParams, usePathname } from "next/navigation";
import { AddCardDialog } from "./add-card-dialog";
import { AddDeckActionButton } from "./add-deck-action-button";

export const ActionButton = () => {
  const pathname = usePathname();
  const params = useParams();

  if (pathname === "/decks") {
    return <AddDeckActionButton />;
  }

  if (pathname === `/decks/${params.id}`) {
    return <AddCardDialog />;
  }

  return null;
};
