import { createFileRoute } from "@tanstack/react-router";
import { useChannel, useWatchMembers, useWatchState } from "@shallabuf-sdk/react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { cn } from "~/utils/cn";
import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { useCallback, useRef, useEffect } from "react";

const ToolbarButton = ({
  onClick,
  active = false,
  disabled = false,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <Button
    variant="ghost"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors",
      active && "bg-gray-200 dark:bg-gray-700",
      disabled && "opacity-50 cursor-not-allowed"
    )}
  >
    {children}
  </Button>
);

const Toolbar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1 p-2 border border-b-0 dark:border-gray-700 rounded-t-md">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
      >
        <strong>B</strong>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
      >
        <em>I</em>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
      >
        <span className="line-through">S</span>
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
      >
        <code>{"</>"}</code>
      </ToolbarButton>

      <Separator orientation="vertical" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
      >
        H1
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
      >
        H2
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
      >
        H3
      </ToolbarButton>

      <Separator orientation="vertical" />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
      >
        • List
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
      >
        1. List
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive("codeBlock")}
      >
        {"</>"}
      </ToolbarButton>

      <Separator orientation="vertical" />

      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        ↺
      </ToolbarButton>

      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        ↻
      </ToolbarButton>
    </div>
  );
};

type EditorProps = {
  content?: string;
  onUpdate?: (html: string) => void;
  onSelectionUpdate?: (position: { line: number; column: number }) => void;
};

function Editor({ content, onUpdate, onSelectionUpdate }: EditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      // Only trigger update if the content actually changed
      if (html !== content) {
        onUpdate?.(html);
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { from } = editor.state.selection;
      const pos = editor.view.coordsAtPos(from);
      const line = Math.floor(pos.top / 20); // Approximate line height
      const column = Math.floor(pos.left / 8); // Approximate character width
      onSelectionUpdate?.({ line, column });
    },
  });

  // Update editor content when content prop changes
  useEffect(() => {
    if (editor && content !== undefined && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  return (
    <div className="h-[400px] grid grid-rows-[auto_1fr]">
      <Toolbar editor={editor} />
      <div className="h-full">
        <EditorContent
          editor={editor}
          className="h-full p-2 prose dark:prose-invert max-w-none overflow-y-auto border rounded-b-md focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] transition-all [&_.ProseMirror]:h-full [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:focus:ring-0 [&_.ProseMirror]:focus:border-none"
        />
      </div>
    </div>
  );
}

export const Route = createFileRoute("/text-editor")({
  component: RouteComponent,
});

function RouteComponent() {
  const payload = useRef({
    channelId: "text-editor",
    initState: {
      content: "",
    },
  });

  const channelResult = useChannel<
    {
      content: string;
    },
    {
      cursorPosition: {
        line: number;
        column: number;
      };
    }
  >(payload.current);

  const content = useWatchState(channelResult, (state) => state.content);
  const members = useWatchMembers(channelResult);

  const handleUpdate = useCallback((html: string) => {
    if (!channelResult.loading && channelResult.channel?.current) {
      channelResult.channel.current.state.content = html;
    }
  }, [channelResult.loading]);

  const handleSelectionUpdate = useCallback((position: { line: number; column: number }) => {
    if (!channelResult.loading && channelResult.channel?.current) {
      const userId = channelResult.channel.current.userId;
      channelResult.channel.current.members[userId!]!.cursorPosition = position;
    }
  }, [channelResult.loading]);

  if (channelResult.loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 min-h-dvh flex flex-col">
      <div className="w-full max-w-2xl h-full mx-auto flex flex-col">
        <h1 className="text-2xl font-bold mb-4">Collaborative Text Editor</h1>
        <div className="flex flex-col gap-4">
          <Editor content={content} onUpdate={handleUpdate} onSelectionUpdate={handleSelectionUpdate} />
          {members &&
            Object.entries(members).map(([id, member]: any) => (
              <div key={id} className="text-sm text-gray-500">
                Line: {member.cursorPosition?.line}, Column:{" "}
                {member.cursorPosition?.column}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
