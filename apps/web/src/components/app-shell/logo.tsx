export const Logo = () => {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <filter
        id="noiseFilter"
        x="-20%"
        y="-20%"
        width="140%"
        height="140%"
        filterUnits="objectBoundingBox"
        primitiveUnits="userSpaceOnUse"
        colorInterpolationFilters="linearRGB"
      >
        <feTurbulence
          type="turbulence"
          baseFrequency="20"
          numOctaves="8"
          seed="18"
          stitchTiles="stitch"
          x="0%"
          y="0%"
          width="100%"
          height="100%"
          result="turbulence"
        />

        <feSpecularLighting
          surfaceScale="3"
          specularConstant="10"
          specularExponent="40"
          lightingColor="#ffffff"
          x="0%"
          y="0%"
          width="100"
          height="100%"
          in="turbulence"
          result="specularLighting"
        >
          <feDistantLight azimuth="100" elevation="200" />

          <animate
            attributeName="specularExponent"
            values="40;25;40"
            dur="5s"
            repeatCount="indefinite"
          />

          <animate
            attributeName="surfaceScale"
            values="3;10;3"
            dur="5s"
            repeatCount="indefinite"
          />

          <feComposite
            in="SourceAlpha"
            in2="specularLighting"
            operator="in"
            result="composite"
          />

          <feComposite in="SourceGraphic" in2="composite" operator="over" />
        </feSpecularLighting>
      </filter>

      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#8a2be2", stopOpacity: 1 }} />
          <stop
            offset="100%"
            style={{ stopColor: "#4a90e2", stopOpacity: 1 }}
          />
        </linearGradient>

        <mask id="noiseMask">
          <rect
            width="100"
            height="100"
            fill="white"
            filter="url(#noiseFilter)"
          >
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 50 50"
              to="360 50 50"
              dur="20s"
              repeatCount="indefinite"
            />
          </rect>
        </mask>
      </defs>

      <circle cx="50" cy="50" r="45" fill="black" />

      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="url(#gradient)"
        strokeWidth="10"
        fill="url(#gradient)"
        mask="url(#noiseMask)"
      />

      <circle cx="50" cy="50" r="45" fill="url(#gradient)" />

      <circle cx="50" cy="30" r="4" fill="white" />
      <circle cx="30" cy="50" r="4" fill="white" />
      <circle cx="70" cy="50" r="4" fill="white" />
      <circle cx="50" cy="70" r="4" fill="white" />
      <circle cx="30" cy="30" r="4" fill="white" />
      <circle cx="70" cy="30" r="4" fill="white" />
      <circle cx="30" cy="70" r="4" fill="white" />
      <circle cx="70" cy="70" r="4" fill="white" />
      <circle cx="40" cy="40" r="4" fill="white" />
      <circle cx="60" cy="40" r="4" fill="white" />
      <circle cx="40" cy="60" r="4" fill="white" />
      <circle cx="60" cy="60" r="4" fill="white" />
      <line x1="50" y1="30" x2="30" y2="50" stroke="white" strokeWidth="2" />
      <line x1="50" y1="30" x2="70" y2="50" stroke="white" strokeWidth="2" />
      <line x1="50" y1="70" x2="30" y2="50" stroke="white" strokeWidth="2" />
      <line x1="50" y1="70" x2="70" y2="50" stroke="white" strokeWidth="2" />
      <line x1="30" y1="30" x2="70" y2="70" stroke="white" strokeWidth="2" />
      <line x1="70" y1="30" x2="30" y2="70" stroke="white" strokeWidth="2" />
      <line x1="40" y1="40" x2="60" y2="60" stroke="white" strokeWidth="2" />
      <line x1="60" y1="40" x2="40" y2="60" stroke="white" strokeWidth="2" />
      <line x1="40" y1="40" x2="30" y2="30" stroke="white" strokeWidth="2" />
      <line x1="60" y1="40" x2="70" y2="30" stroke="white" strokeWidth="2" />
      <line x1="40" y1="60" x2="30" y2="70" stroke="white" strokeWidth="2" />
      <line x1="60" y1="60" x2="70" y2="70" stroke="white" strokeWidth="2" />
      <line x1="30" y1="30" x2="70" y2="70" stroke="white" strokeWidth="2" />
      <line x1="70" y1="30" x2="30" y2="70" stroke="white" strokeWidth="2" />
    </svg>
  );
};
