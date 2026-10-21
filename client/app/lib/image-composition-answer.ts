import {
  createDefaultImageCompositionTemplate,
  normalizeImageCompositionTemplate,
  type ImageCompositionAsset,
  type ImageCompositionCanvas,
  type ImageCompositionTemplate,
} from "./image-composition-template";

export type ImageCompositionPlacement = {
  assetId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
};

export type ResolvedImageCompositionElement = ImageCompositionAsset &
  ImageCompositionPlacement;

export type ImageCompositionAnswerData = {
  version: 1;
  type: "image-composition";
  canvas: ImageCompositionCanvas;
  placements: ImageCompositionPlacement[];
};

type ImageCompositionAnswerLike =
  | ImageCompositionAnswerData
  | {
      version?: 1;
      type?: string;
      canvas?: Partial<ImageCompositionCanvas>;
      placements?: unknown;
      elements?: unknown;
    }
  | null
  | undefined;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeNumber = (value: unknown, fallback: number) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? Math.round(numberValue) : fallback;
};

const createId = () =>
  `placement-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const createDefaultImageCompositionAnswer = (
  template?: ImageCompositionTemplate | null
): ImageCompositionAnswerData => {
  const normalizedTemplate = normalizeImageCompositionTemplate(
    template ?? createDefaultImageCompositionTemplate()
  );

  return {
    version: 1,
    type: "image-composition",
    canvas: { ...normalizedTemplate.canvas },
    placements: normalizedTemplate.assets.map((asset, index) => ({
      assetId: asset.id,
      x: asset.x,
      y: asset.y,
      width: asset.width,
      height: asset.height,
      zIndex: index,
    })),
  };
};

export const createImageCompositionPlacementId = () => createId();

const normalizePlacement = (
  placement: unknown,
  canvas: ImageCompositionCanvas,
  fallbackAssetId?: string
): ImageCompositionPlacement | null => {
  if (!placement || typeof placement !== "object") {
    return null;
  }

  const record = placement as Record<string, unknown>;
  const assetId =
    typeof record.assetId === "string" && record.assetId
      ? record.assetId
      : fallbackAssetId;

  if (!assetId) {
    return null;
  }

  const width = clamp(
    normalizeNumber(record.width, 160),
    24,
    canvas.width
  );
  const height = clamp(
    normalizeNumber(record.height, 120),
    24,
    canvas.height
  );

  return {
    assetId,
    x: clamp(normalizeNumber(record.x, 0), 0, Math.max(0, canvas.width - width)),
    y: clamp(normalizeNumber(record.y, 0), 0, Math.max(0, canvas.height - height)),
    width,
    height,
    zIndex: normalizeNumber(record.zIndex, 0),
  };
};

const sortPlacements = (placements: ImageCompositionPlacement[]) =>
  [...placements].sort((a, b) => a.zIndex - b.zIndex);

const resolvePlacementByAssetId = (
  placements: ImageCompositionPlacement[]
) =>
  new Map(
    placements.map((placement) => [placement.assetId, placement])
  );

export const normalizeImageCompositionAnswer = (
  value?: ImageCompositionAnswerLike,
  template?: ImageCompositionTemplate | null
): ImageCompositionAnswerData => {
  const normalizedTemplate = normalizeImageCompositionTemplate(
    template ?? createDefaultImageCompositionTemplate()
  );

  if (!value || (value as { type?: unknown }).type !== "image-composition") {
    return createDefaultImageCompositionAnswer(normalizedTemplate);
  }

  const canvas = {
    width: normalizedTemplate.canvas.width,
    height: normalizedTemplate.canvas.height,
    backgroundColor: normalizedTemplate.canvas.backgroundColor,
  };

  const rawPlacements = Array.isArray(value.placements)
    ? value.placements
    : Array.isArray(value.elements)
      ? value.elements
      : [];

  const placements = rawPlacements
    .map((placement, index) =>
      normalizePlacement(
        placement,
        canvas,
        normalizedTemplate.assets[index]?.id
      )
    )
    .filter(Boolean) as ImageCompositionPlacement[];

  const placementsByAssetId = resolvePlacementByAssetId(placements);

  const normalizedPlacements = normalizedTemplate.assets.map((asset, index) => {
    const placement =
      placementsByAssetId.get(asset.id) ??
      {
        assetId: asset.id,
        x: asset.x,
        y: asset.y,
        width: asset.width,
        height: asset.height,
        zIndex: index,
      };

    return {
      ...placement,
      assetId: asset.id,
      x: clamp(placement.x, 0, Math.max(0, canvas.width - placement.width)),
      y: clamp(placement.y, 0, Math.max(0, canvas.height - placement.height)),
    };
  });

  const extraPlacements = placements.filter(
    (placement) =>
      !normalizedTemplate.assets.some((asset) => asset.id === placement.assetId)
  );

  return {
    version: 1,
    type: "image-composition",
    canvas,
    placements: sortPlacements([...normalizedPlacements, ...extraPlacements]).map(
      (placement, index) => ({
        ...placement,
        zIndex: index,
      })
    ),
  };
};

export const parseImageCompositionAnswer = (
  value?: string | null,
  template?: ImageCompositionTemplate | null
): ImageCompositionAnswerData => {
  if (!value) {
    return createDefaultImageCompositionAnswer(template);
  }

  try {
    return normalizeImageCompositionAnswer(JSON.parse(value) as ImageCompositionAnswerLike, template);
  } catch {
    return createDefaultImageCompositionAnswer(template);
  }
};

export const serializeImageCompositionAnswer = (
  value: ImageCompositionAnswerData,
  template?: ImageCompositionTemplate | null
) => JSON.stringify(normalizeImageCompositionAnswer(value, template));

export const getNextPlacementZIndex = (placements: ImageCompositionPlacement[]) =>
  placements.length === 0 ? 0 : Math.max(...placements.map((placement) => placement.zIndex)) + 1;

export const updateImageCompositionPlacement = (
  answer: ImageCompositionAnswerData,
  assetId: string,
  updater: (placement: ImageCompositionPlacement) => ImageCompositionPlacement
) =>
  normalizeImageCompositionAnswer({
    ...answer,
    placements: answer.placements.map((placement) =>
      placement.assetId === assetId ? updater(placement) : placement
    ),
  });

export const addImageCompositionPlacement = (
  answer: ImageCompositionAnswerData,
  placement: Omit<ImageCompositionPlacement, "zIndex"> &
    Partial<Pick<ImageCompositionPlacement, "zIndex">>
) =>
  normalizeImageCompositionAnswer({
    ...answer,
    placements: [
      ...answer.placements,
      {
        ...placement,
        zIndex: placement.zIndex ?? getNextPlacementZIndex(answer.placements),
      },
    ],
  });

export const removeImageCompositionPlacement = (
  answer: ImageCompositionAnswerData,
  assetId: string
) =>
  normalizeImageCompositionAnswer({
    ...answer,
    placements: answer.placements.filter((placement) => placement.assetId !== assetId),
  });

export const moveImageCompositionPlacementToIndex = (
  placements: ImageCompositionPlacement[],
  assetId: string,
  index: number
) => {
  const current = sortPlacements(placements);
  const position = current.findIndex((placement) => placement.assetId === assetId);
  if (position < 0) {
    return current;
  }

  const [moved] = current.splice(position, 1);
  current.splice(clamp(index, 0, current.length), 0, moved);
  return current.map((placement, nextIndex) => ({
    ...placement,
    zIndex: nextIndex,
  }));
};

export const moveImageCompositionPlacementByDelta = (
  placements: ImageCompositionPlacement[],
  assetId: string,
  delta: Partial<Pick<ImageCompositionPlacement, "x" | "y" | "width" | "height">>,
  canvas: ImageCompositionCanvas
) =>
  placements.map((placement) => {
    if (placement.assetId !== assetId) return placement;

    const nextWidth = clamp(delta.width ?? placement.width, 24, canvas.width);
    const nextHeight = clamp(delta.height ?? placement.height, 24, canvas.height);
    const maxX = Math.max(0, canvas.width - nextWidth);
    const maxY = Math.max(0, canvas.height - nextHeight);

    return {
      ...placement,
      x: clamp(delta.x ?? placement.x, 0, maxX),
      y: clamp(delta.y ?? placement.y, 0, maxY),
      width: nextWidth,
      height: nextHeight,
    };
  });

export const resolveImageCompositionElements = (
  template?: ImageCompositionTemplate | null,
  answer?: ImageCompositionAnswerData | string | null
): ResolvedImageCompositionElement[] => {
  const normalizedTemplate = normalizeImageCompositionTemplate(
    template ?? createDefaultImageCompositionTemplate()
  );
  const normalizedAnswer =
    typeof answer === "string"
      ? parseImageCompositionAnswer(answer, normalizedTemplate)
      : normalizeImageCompositionAnswer(answer, normalizedTemplate);

  const placementsByAssetId = resolvePlacementByAssetId(normalizedAnswer.placements);

  return normalizedTemplate.assets
    .map((asset, index) => {
      const placement =
        placementsByAssetId.get(asset.id) ??
        {
          assetId: asset.id,
          x: asset.x,
          y: asset.y,
          width: asset.width,
          height: asset.height,
          zIndex: index,
        };

      return {
        ...asset,
        ...placement,
        assetId: asset.id,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
      };
    })
    .sort((a, b) => a.zIndex - b.zIndex);
};
