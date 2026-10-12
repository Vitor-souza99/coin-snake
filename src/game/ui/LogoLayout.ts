export interface LogoLayout {
  centerX: number;
  logoY: number;
  logoSize: number;
  titleY: number;
  titleFontSize: number;
}

/** Fits the animated brand mark and title inside portrait and landscape viewports. */
export function logoLayout(width: number, height: number): LogoLayout {
  const safeWidth = Math.max(1, width);
  const safeHeight = Math.max(1, height);
  const landscape = safeWidth > safeHeight;
  const logoSize = Math.max(48, Math.min(260, safeWidth * (landscape ? 0.3 : 0.52), safeHeight * (landscape ? 0.38 : 0.34)));

  return {
    centerX: safeWidth / 2,
    logoY: safeHeight * (landscape ? 0.36 : 0.39),
    logoSize,
    titleY: safeHeight * (landscape ? 0.79 : 0.76),
    titleFontSize: Math.max(22, Math.min(48, safeWidth * (landscape ? 0.065 : 0.1), safeHeight * 0.12)),
  };
}