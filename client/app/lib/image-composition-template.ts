export type ImageCompositionBackgroundImage = {
  src: string;
  name?: string;
  width: number;
  height: number;
  fit: "cover" | "contain";
};

export type ImageCompositionCanvas = {
  width: number;
  height: number;
  backgroundColor: string;
};

export type ImageCompositionAsset = {
  id: string;
  src: string;
  name?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  locked?: boolean;
};

export type ImageCompositionTemplate = {
  version: 1;
  canvas: ImageCompositionCanvas;
  backgroundImage: ImageCompositionBackgroundImage | null;
  assets: ImageCompositionAsset[];
};

type ImageCompositionTemplateLike =
  | ImageCompositionTemplate
  | {
      version?: 1;
      canvas?: Partial<ImageCompositionCanvas>;
      backgroundImage?: Partial<ImageCompositionBackgroundImage> | null;
      assets?: unknown;
    }
  | null
  | undefined;

export const DEFAULT_IMAGE_COMPOSITION_CANVAS: ImageCompositionCanvas = {
  width: 960,
  height: 540,
  backgroundColor: "#ffffff",
};

const DEFAULT_ASSET_WIDTH = 160;
const DEFAULT_ASSET_HEIGHT = 120;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeNumber = (value: unknown, fallback: number) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.round(numberValue) : fallback;
};

const createId = () =>
  `asset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createImageCompositionAssetId = () => createId();

export const createDefaultImageCompositionTemplate = (): ImageCompositionTemplate => ({
  version: 1,
  canvas: { ...DEFAULT_IMAGE_COMPOSITION_CANVAS },
  backgroundImage: null,
  assets: [],
});

const normalizeCanvas = (
  canvas?: Partial<ImageCompositionCanvas> | null
): ImageCompositionCanvas => ({
  width: Number.isFinite(canvas?.width)
    ? Math.max(1, Math.round(Number(canvas?.width)))
    : DEFAULT_IMAGE_COMPOSITION_CANVAS.width,
  height: Number.isFinite(canvas?.height)
    ? Math.max(1, Math.round(Number(canvas?.height)))
    : DEFAULT_IMAGE_COMPOSITION_CANVAS.height,
  backgroundColor:
    typeof canvas?.backgroundColor === "string" && canvas.backgroundColor.trim()
      ? canvas.backgroundColor
      : DEFAULT_IMAGE_COMPOSITION_CANVAS.backgroundColor,
});

const normalizeBackgroundImage = (
  backgroundImage?: Partial<ImageCompositionBackgroundImage> | null
): ImageCompositionBackgroundImage | null => {
  if (!backgroundImage || typeof backgroundImage.src !== "string" || !backgroundImage.src.trim()) {
    return null;
  }

  return {
    src: backgroundImage.src,
    name: typeof backgroundImage.name === "string" ? backgroundImage.name : undefined,
    width: normalizeNumber(backgroundImage.width, DEFAULT_IMAGE_COMPOSITION_CANVAS.width),
    height: normalizeNumber(backgroundImage.height, DEFAULT_IMAGE_COMPOSITION_CANVAS.height),
    fit:
      backgroundImage.fit === "contain" || backgroundImage.fit === "cover"
        ? backgroundImage.fit
        : "cover",
  };
};

const normalizeAsset = (
  asset: unknown,
  canvas: ImageCompositionCanvas
): ImageCompositionAsset | null => {
  if (!asset || typeof asset !== "object") {
    return null;
  }

  const record = asset as Record<string, unknown>;
  if (typeof record.src !== "string" || !record.src.trim()) {
    return null;
  }

  const width = clamp(
    normalizeNumber(record.width, DEFAULT_ASSET_WIDTH),
    24,
    canvas.width
  );
  const height = clamp(
    normalizeNumber(record.height, DEFAULT_ASSET_HEIGHT),
    24,
    canvas.height
  );

  return {
    id: typeof record.id === "string" && record.id ? record.id : createId(),
    src: record.src,
    name: typeof record.name === "string" ? record.name : undefined,
    x: clamp(normalizeNumber(record.x, 0), 0, Math.max(0, canvas.width - width)),
    y: clamp(normalizeNumber(record.y, 0), 0, Math.max(0, canvas.height - height)),
    width,
    height,
    zIndex: normalizeNumber(record.zIndex, 0),
    locked: Boolean(record.locked),
  };
};

const sortAssets = (assets: ImageCompositionAsset[]) =>
  [...assets].sort((a, b) => a.zIndex - b.zIndex);

export const normalizeImageCompositionTemplate = (
  value?: ImageCompositionTemplateLike
): ImageCompositionTemplate => {
  if (!value) {
    return createDefaultImageCompositionTemplate();
  }

  const canvas = normalizeCanvas(value.canvas);
  const backgroundImage = normalizeBackgroundImage(value.backgroundImage);
  const assets = Array.isArray(value.assets)
    ? (value.assets
        .map((asset) => normalizeAsset(asset, canvas))
        .filter(Boolean) as ImageCompositionAsset[])
    : [];

  return {
    version: 1,
    canvas,
    backgroundImage,
    assets: sortAssets(assets).map((asset, index) => ({
      ...asset,
      zIndex: index,
    })),
  };
};

export const parseImageCompositionTemplate = (
  value?: string | null
): ImageCompositionTemplate => {
  if (!value) {
    return createDefaultImageCompositionTemplate();
  }

  try {
    return normalizeImageCompositionTemplate(JSON.parse(value) as ImageCompositionTemplateLike);
  } catch {
    return createDefaultImageCompositionTemplate();
  }
};

export const serializeImageCompositionTemplate = (
  value: ImageCompositionTemplate
) => JSON.stringify(normalizeImageCompositionTemplate(value));

export const getNextAssetZIndex = (assets: ImageCompositionAsset[]) =>
  assets.length === 0 ? 0 : Math.max(...assets.map((asset) => asset.zIndex)) + 1;

export const addImageCompositionAsset = (
  template: ImageCompositionTemplate,
  asset: Omit<ImageCompositionAsset, "zIndex"> & Partial<Pick<ImageCompositionAsset, "zIndex">>
) =>
  normalizeImageCompositionTemplate({
    ...template,
    assets: [
      ...template.assets,
      {
        ...asset,
        zIndex: asset.zIndex ?? getNextAssetZIndex(template.assets),
      },
    ],
  });

export const updateImageCompositionAsset = (
  template: ImageCompositionTemplate,
  assetId: string,
  updater: (asset: ImageCompositionAsset) => ImageCompositionAsset
) =>
  normalizeImageCompositionTemplate({
    ...template,
    assets: template.assets.map((asset) =>
      asset.id === assetId ? updater(asset) : asset
    ),
  });

export const removeImageCompositionAsset = (
  template: ImageCompositionTemplate,
  assetId: string
) =>
  normalizeImageCompositionTemplate({
    ...template,
    assets: template.assets.filter((asset) => asset.id !== assetId),
  });

export const moveImageCompositionAssetToIndex = (
  assets: ImageCompositionAsset[],
  assetId: string,
  index: number
) => {
  const current = sortAssets(assets);
  const position = current.findIndex((asset) => asset.id === assetId);
  if (position < 0) {
    return current;
  }

  const [moved] = current.splice(position, 1);
  current.splice(clamp(index, 0, current.length), 0, moved);
  return current.map((asset, nextIndex) => ({
    ...asset,
    zIndex: nextIndex,
  }));
};

export const moveImageCompositionAssetByDelta = (
  assets: ImageCompositionAsset[],
  assetId: string,
  delta: Partial<Pick<ImageCompositionAsset, "x" | "y" | "width" | "height">>,
  canvas: ImageCompositionCanvas
) =>
  assets.map((asset) => {
    if (asset.id !== assetId) return asset;

    const nextWidth = clamp(delta.width ?? asset.width, 24, canvas.width);
    const nextHeight = clamp(delta.height ?? asset.height, 24, canvas.height);
    const maxX = Math.max(0, canvas.width - nextWidth);
    const maxY = Math.max(0, canvas.height - nextHeight);

    return {
      ...asset,
      x: clamp(delta.x ?? asset.x, 0, maxX),
      y: clamp(delta.y ?? asset.y, 0, maxY),
      width: nextWidth,
      height: nextHeight,
    };
  });
