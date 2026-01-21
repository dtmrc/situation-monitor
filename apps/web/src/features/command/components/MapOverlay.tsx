/**
 * MapOverlay - Tactical scanline effect overlay for the map
 *
 * Creates a subtle CRT/tactical display aesthetic without
 * interfering with map interaction.
 */

interface MapOverlayProps {
  /** Enable scanline effect */
  scanlines?: boolean;
  /** Enable subtle noise texture */
  noise?: boolean;
  /** Enable vignette darkening at edges */
  vignette?: boolean;
}

export function MapOverlay({ scanlines = true, noise = false, vignette = true }: MapOverlayProps) {
  return (
    <>
      {/* Scanline overlay */}
      {scanlines && (
        <div
          className="absolute inset-0 pointer-events-none z-[100]"
          style={{
            background: `repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(0, 0, 0, 0.03) 2px,
              rgba(0, 0, 0, 0.03) 4px
            )`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Noise texture overlay */}
      {noise && (
        <div
          className="absolute inset-0 pointer-events-none z-[99] opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Vignette effect */}
      {vignette && (
        <div
          className="absolute inset-0 pointer-events-none z-[98]"
          style={{
            background: `radial-gradient(
              ellipse at center,
              transparent 50%,
              rgba(0, 0, 0, 0.3) 100%
            )`,
          }}
          aria-hidden="true"
        />
      )}

      {/* Corner accents - tactical frame effect */}
      <div className="absolute inset-0 pointer-events-none z-[101]" aria-hidden="true">
        {/* Top-left corner */}
        <div className="absolute top-0 left-0 w-16 h-16">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/40 to-transparent" />
          <div className="absolute top-0 left-0 h-full w-[2px] bg-gradient-to-b from-primary/40 to-transparent" />
        </div>

        {/* Top-right corner */}
        <div className="absolute top-0 right-0 w-16 h-16">
          <div className="absolute top-0 right-0 w-full h-[2px] bg-gradient-to-l from-primary/40 to-transparent" />
          <div className="absolute top-0 right-0 h-full w-[2px] bg-gradient-to-b from-primary/40 to-transparent" />
        </div>

        {/* Bottom-left corner */}
        <div className="absolute bottom-0 left-0 w-16 h-16">
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-gradient-to-r from-primary/40 to-transparent" />
          <div className="absolute bottom-0 left-0 h-full w-[2px] bg-gradient-to-t from-primary/40 to-transparent" />
        </div>

        {/* Bottom-right corner */}
        <div className="absolute bottom-0 right-0 w-16 h-16">
          <div className="absolute bottom-0 right-0 w-full h-[2px] bg-gradient-to-l from-primary/40 to-transparent" />
          <div className="absolute bottom-0 right-0 h-full w-[2px] bg-gradient-to-t from-primary/40 to-transparent" />
        </div>
      </div>
    </>
  );
}
