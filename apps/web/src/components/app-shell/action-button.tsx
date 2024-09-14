"use client";
import { useParams, usePathname } from "next/navigation";
import { AddCardDialog } from "./add-card-dialog";
import { AddDeckDialog } from "./add-deck-dialog";

export const ActionButton = () => {
  const pathname = usePathname();
  const params = useParams();

  if (pathname === "/decks") {
    return <AddDeckDialog />;
  }

  if (pathname === `/decks/${params.id}`) {
    return <AddCardDialog />;
  }

  return null;
};
