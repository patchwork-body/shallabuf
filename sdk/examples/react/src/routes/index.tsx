import { useChannel, useWatchMembers, useWatchState } from "@shallabuf-sdk/react";
import { createFileRoute } from "@tanstack/react-router";

// Add custom styles for the range-progress class
const style = `
.range-progress::-webkit-slider-runnable-track {
  background: linear-gradient(to right, #ef4444, #f59e42, #22c55e) 0/var(--progress, 100%) 100% no-repeat, #222 0/100% 100% no-repeat;
}
.range-progress::-webkit-slider-thumb {
  /* existing thumb styles are handled by Tailwind */
}
.range-progress::-moz-range-progress {
  background: linear-gradient(to right, #ef4444, #f59e42, #22c55e);
}
.range-progress::-moz-range-track {
  background: #222;
}
.range-progress::-ms-fill-lower {
  background: linear-gradient(to right, #ef4444, #f59e42, #22c55e);
}
.range-progress::-ms-fill-upper {
  background: #222;
}
`;

if (
  typeof window !== "undefined" &&
  !document.getElementById("range-progress-style")
) {
  const styleTag = document.createElement("style");
  styleTag.id = "range-progress-style";
  styleTag.innerHTML = style;
  document.head.appendChild(styleTag);
}

export const Route = createFileRoute("/")({
  component: Counter,
});

function Counter() {
  const channelResult = useChannel<{ count: number }, { cursorPosition: { line: number, column: number } }>({
    channelId: "counter",
    initState: {
      count: 0,
    },
  });

  const count = useWatchState(channelResult, (state) => state.count);

  if (channelResult.loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-2 min-h-dvh flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-4 mt-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (channelResult.channel.current) {
                channelResult.channel.current.state.count--;
              }
            }}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Decrement
          </button>
          <span className="text-2xl font-bold">{count}</span>
          <button
            onClick={() => {
              if (channelResult.channel.current) {
                channelResult.channel.current.state.count++;
              }
            }}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Increment
          </button>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (channelResult.channel.current) {
                channelResult.channel.current.state.count *= 2;
              }
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Multiply by 2
          </button>
          <button
            onClick={() => {
              if (channelResult.channel.current) {
                channelResult.channel.current.state.count = Math.floor(
                  channelResult.channel.current.state.count / 2
                );
              }
            }}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Divide by 2
          </button>
          <button
            onClick={() => {
              if (channelResult.channel.current) {
                channelResult.channel.current.state.count = 0;
              }
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Reset
          </button>
        </div>
        <div className="flex flex-col items-center gap-2 w-full max-w-md px-4">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm font-medium text-gray-500">-100</span>
            <span className="text-sm font-medium text-gray-500">100</span>
          </div>
          <div className="relative w-full">
            <input
              type="range"
              min="-100"
              max="100"
              value={count}
              onChange={(e) => {
                if (channelResult.channel.current) {
                  channelResult.channel.current.state.count = parseInt(
                    e.target.value
                  );
                }
              }}
              className="range-progress w-full h-2 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-gray-300 [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-200 [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:hover:shadow-xl [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-gray-300 [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:duration-200 [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:hover:shadow-xl"
              style={
                {
                  "--progress": `${((Number(count) + 100) / 200) * 100}%`,
                } as any
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">
              Current value:
            </span>
            <span className="text-lg font-bold text-gray-700">{count}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
