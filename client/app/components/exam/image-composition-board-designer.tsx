"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent as ReactDragEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Layers3,
  Move,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { uploadMediaToCloudinary } from "@/lib/cloudinary-media-service";
import {
  addImageCompositionAsset,
  createImageCompositionAssetId,
  moveImageCompositionAssetByDelta,
  moveImageCompositionAssetToIndex,
  normalizeImageCompositionTemplate,
  removeImageCompositionAsset,
  updateImageCompositionAsset,
  type ImageCompositionAsset,
  type ImageCompositionTemplate,
} from "@/lib/image-composition-template";

type ImageCompositionBoardDesignerProps = {
  template: ImageCompositionTemplate | null | undefined;
  onChange: (template: ImageCompositionTemplate) => void;
  className?: string;
};

type Interaction =
  | {
      kind: "drag";
      assetId: string;
      pointerId: number;
      offsetX: number;
      offsetY: number;
    }
  | {
      kind: "resize";
      assetId: string;
      pointerId: number;
      originX: number;
      originY: number;
      originWidth: number;
      originHeight: number;
      aspectRatio: number;
    };

const MIN_ASSET_SIZE = 48;
const DEFAULT_UPLOAD_SIZE = 220;
const MAX_UPLOAD_RATIO = 0.32;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const fitWithinBounds = (
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
) => {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : DEFAULT_UPLOAD_SIZE;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : DEFAULT_UPLOAD_SIZE;
  const ratio = safeWidth / safeHeight;

  let nextWidth = Math.min(maxWidth, safeWidth);
  let nextHeight = nextWidth / ratio;

  if (nextHeight > maxHeight) {
    nextHeight = Math.min(maxHeight, safeHeight);
    nextWidth = nextHeight * ratio;
  }

  return {
    width: Math.max(MIN_ASSET_SIZE, Math.round(nextWidth)),
    height: Math.max(MIN_ASSET_SIZE, Math.round(nextHeight)),
  };
};

const loadImageSize = (src: string) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const image = new window.Image();
    image.onload = () =>
      resolve({
        width: image.naturalWidth || DEFAULT_UPLOAD_SIZE,
        height: image.naturalHeight || DEFAULT_UPLOAD_SIZE,
      });
    image.onerror = () =>
      resolve({
        width: DEFAULT_UPLOAD_SIZE,
        height: DEFAULT_UPLOAD_SIZE,
      });
    image.src = src;
  });

export function ImageCompositionBoardDesigner({
  template,
  onChange,
  className,
}: ImageCompositionBoardDesignerProps) {
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const assetInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundInputRef = useRef<HTMLInputElement | null>(null);
  const interactionRef = useRef<Interaction | null>(null);
  const templateRef = useRef<ImageCompositionTemplate>(
    normalizeImageCompositionTemplate(template)
  );
  const currentTemplateRef = useRef<ImageCompositionTemplate>(
    normalizeImageCompositionTemplate(template)
  );
  const [currentTemplate, setCurrentTemplate] = useState<ImageCompositionTemplate>(() =>
    normalizeImageCompositionTemplate(template)
  );
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dropActive, setDropActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedAssets = useMemo(
    () => [...currentTemplate.assets].sort((a, b) => a.zIndex - b.zIndex),
    [currentTemplate.assets]
  );
  const selectedAsset = useMemo(
    () => sortedAssets.find((asset) => asset.id === selectedAssetId) ?? null,
    [selectedAssetId, sortedAssets]
  );

  useEffect(() => {
    templateRef.current = currentTemplate;
    currentTemplateRef.current = currentTemplate;
  }, [currentTemplate]);

  useEffect(() => {
    const next = normalizeImageCompositionTemplate(template);
    setCurrentTemplate(next);
    templateRef.current = next;
    setSelectedAssetId(null);
  }, [template]);

  const emitChange = (next: ImageCompositionTemplate) => {
    const normalized = normalizeImageCompositionTemplate(next);
    templateRef.current = normalized;
    currentTemplateRef.current = normalized;
    setCurrentTemplate(normalized);
    onChange(normalized);
  };

  const getCanvasMetrics = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      width: currentTemplate.canvas.width,
      height: currentTemplate.canvas.height,
      rect,
    };
  };

  const getPointFromClient = (clientX: number, clientY: number) => {
    const metrics = getCanvasMetrics();
    if (!metrics) return null;

    const x = ((clientX - metrics.rect.left) / metrics.rect.width) * metrics.width;
    const y = ((clientY - metrics.rect.top) / metrics.rect.height) * metrics.height;

    return {
      x: clamp(Math.round(x), 0, metrics.width),
      y: clamp(Math.round(y), 0, metrics.height),
      width: metrics.width,
      height: metrics.height,
    };
  };

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const interaction = interactionRef.current;
      if (!interaction || event.pointerId !== interaction.pointerId) {
        return;
      }

      const point = getPointFromClient(event.clientX, event.clientY);
      if (!point) return;
      const latestTemplate = currentTemplateRef.current;

      if (interaction.kind === "drag") {
        const nextAssets = moveImageCompositionAssetByDelta(
          latestTemplate.assets,
          interaction.assetId,
          {
            x: point.x - interaction.offsetX,
            y: point.y - interaction.offsetY,
          },
          latestTemplate.canvas
        );

        emitChange({
          ...latestTemplate,
          assets: nextAssets,
        });
        return;
      }

      const maxWidth = Math.max(MIN_ASSET_SIZE, point.width - interaction.originX);
      const maxHeight = Math.max(MIN_ASSET_SIZE, point.height - interaction.originY);
      const preferredWidth = clamp(
        point.x - interaction.originX,
        MIN_ASSET_SIZE,
        maxWidth
      );
      const aspectRatio = interaction.aspectRatio || 1;
      let nextWidth = preferredWidth;
      let nextHeight = Math.round(nextWidth / aspectRatio);

      if (nextHeight > maxHeight) {
        nextHeight = clamp(point.y - interaction.originY, MIN_ASSET_SIZE, maxHeight);
        nextWidth = Math.round(nextHeight * aspectRatio);
      }

      const nextAssets = updateImageCompositionAsset(
        {
          ...latestTemplate,
          assets: latestTemplate.assets,
        },
        interaction.assetId,
        (asset) => ({
          ...asset,
          width: clamp(nextWidth, MIN_ASSET_SIZE, maxWidth),
          height: clamp(nextHeight, MIN_ASSET_SIZE, maxHeight),
        })
      ).assets;

      emitChange({
        ...latestTemplate,
        assets: nextAssets,
      });
    };

    const handleUp = (event: PointerEvent) => {
      if (interactionRef.current?.pointerId !== event.pointerId) return;
      interactionRef.current = null;
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, []);

  const addAssets = async (files: FileList | File[]) => {
    const images = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (images.length === 0) {
      setError("Please upload image files only.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      let nextTemplate = templateRef.current;

      for (const file of images) {
        const upload = await uploadMediaToCloudinary(file);
        const naturalSize = await loadImageSize(upload.url);
        const metrics = getCanvasMetrics();
        const canvasWidth = metrics?.width ?? nextTemplate.canvas.width;
        const canvasHeight = metrics?.height ?? nextTemplate.canvas.height;
        const maxWidth = Math.max(DEFAULT_UPLOAD_SIZE, Math.round(canvasWidth * MAX_UPLOAD_RATIO));
        const maxHeight = Math.max(DEFAULT_UPLOAD_SIZE, Math.round(canvasHeight * MAX_UPLOAD_RATIO));
        const fitted = fitWithinBounds(
          naturalSize.width,
          naturalSize.height,
          maxWidth,
          maxHeight
        );
        const id = createImageCompositionAssetId();

        nextTemplate = addImageCompositionAsset(nextTemplate, {
          id,
          src: upload.url,
          name: file.name,
          x: clamp(
            Math.round((nextTemplate.canvas.width - fitted.width) / 2) +
              Math.min(nextTemplate.assets.length * 18, 96),
            0,
            Math.max(0, nextTemplate.canvas.width - fitted.width)
          ),
          y: clamp(
            Math.round((nextTemplate.canvas.height - fitted.height) / 2) +
              Math.min(nextTemplate.assets.length * 18, 96),
            0,
            Math.max(0, nextTemplate.canvas.height - fitted.height)
          ),
          width: fitted.width,
          height: fitted.height,
          zIndex: nextTemplate.assets.length,
        });

        emitChange(nextTemplate);

          setSelectedAssetId(id);
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload one or more images."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const updateBackground = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Background must be an image.");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const upload = await uploadMediaToCloudinary(file);
      const size = await loadImageSize(upload.url);
      emitChange({
        ...currentTemplate,
        canvas: {
          ...currentTemplate.canvas,
          width: size.width,
          height: size.height,
        },
        backgroundImage: {
          src: upload.url,
          name: file.name,
          width: size.width,
          height: size.height,
          fit: "cover",
        },
      });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload background image."
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleAssetInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      await addAssets(files);
    }
    event.target.value = "";
  };

  const handleBackgroundInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      await updateBackground(file);
    }
    event.target.value = "";
  };

  const handleCanvasDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDropActive(false);
    if (event.dataTransfer.files.length > 0) {
      await addAssets(event.dataTransfer.files);
    }
  };

  const startDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    asset: ImageCompositionAsset
  ) => {
    const point = getPointFromClient(event.clientX, event.clientY);
    if (!point) return;

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedAssetId(asset.id);
    interactionRef.current = {
      kind: "drag",
      assetId: asset.id,
      pointerId: event.pointerId,
      offsetX: point.x - asset.x,
      offsetY: point.y - asset.y,
    };
  };

  const startResize = (
    event: ReactPointerEvent<HTMLButtonElement>,
    asset: ImageCompositionAsset
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedAssetId(asset.id);
    interactionRef.current = {
      kind: "resize",
      assetId: asset.id,
      pointerId: event.pointerId,
      originX: asset.x,
      originY: asset.y,
      originWidth: asset.width,
      originHeight: asset.height,
      aspectRatio:
        asset.width && asset.height ? asset.width / asset.height : 1,
    };
  };

  const removeSelected = () => {
    if (!selectedAssetId) return;
    emitChange(removeImageCompositionAsset(currentTemplate, selectedAssetId));
    setSelectedAssetId(null);
  };

  const reorderSelected = (direction: "forward" | "backward" | "front" | "back") => {
    if (!selectedAssetId) return;

    const ordered = [...currentTemplate.assets].sort((a, b) => a.zIndex - b.zIndex);
    const index = ordered.findIndex((asset) => asset.id === selectedAssetId);
    if (index < 0) return;

    const nextAssets =
      direction === "front"
        ? moveImageCompositionAssetToIndex(currentTemplate.assets, selectedAssetId, ordered.length - 1)
        : direction === "back"
          ? moveImageCompositionAssetToIndex(currentTemplate.assets, selectedAssetId, 0)
          : moveImageCompositionAssetToIndex(
              currentTemplate.assets,
              selectedAssetId,
              direction === "forward" ? index + 1 : index - 1
            );

    emitChange({
      ...currentTemplate,
      assets: nextAssets,
    });
  };

  const handleAssetPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    asset: ImageCompositionAsset
  ) => {
    startDrag(event, asset);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-3 rounded-lg border border-border bg-slate-50 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => backgroundInputRef.current?.click()}
            disabled={isUploading}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload Background
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => assetInputRef.current?.click()}
            disabled={isUploading}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Images
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => reorderSelected("forward")}
            disabled={!selectedAsset}
          >
            <Layers3 className="mr-2 h-4 w-4" />
            Bring Forward
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => reorderSelected("backward")}
            disabled={!selectedAsset}
          >
            <Move className="mr-2 h-4 w-4" />
            Send Backward
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => reorderSelected("front")}
            disabled={!selectedAsset}
          >
            <ArrowUpToLine className="mr-2 h-4 w-4" />
            Bring to Front
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => reorderSelected("back")}
            disabled={!selectedAsset}
          >
            <ArrowDownToLine className="mr-2 h-4 w-4" />
            Send to Back
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={removeSelected}
            disabled={!selectedAsset}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Remove Selected
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <Label className="flex items-center gap-2">
            <span className="font-medium text-foreground">Canvas Width</span>
            <Input
              type="number"
              min={320}
              value={currentTemplate.canvas.width}
              onChange={(event) => {
                const width = Number(event.target.value);
                if (Number.isNaN(width)) return;
                emitChange({
                  ...currentTemplate,
                  canvas: {
                    ...currentTemplate.canvas,
                    width: Math.max(320, Math.round(width)),
                  },
                });
              }}
              className="h-8 w-24"
            />
          </Label>
          <Label className="flex items-center gap-2">
            <span className="font-medium text-foreground">Canvas Height</span>
            <Input
              type="number"
              min={240}
              value={currentTemplate.canvas.height}
              onChange={(event) => {
                const height = Number(event.target.value);
                if (Number.isNaN(height)) return;
                emitChange({
                  ...currentTemplate,
                  canvas: {
                    ...currentTemplate.canvas,
                    height: Math.max(240, Math.round(height)),
                  },
                });
              }}
              className="h-8 w-24"
            />
          </Label>
          <Label className="flex items-center gap-2">
            <span className="font-medium text-foreground">Background Color</span>
            <Input
              type="color"
              value={currentTemplate.canvas.backgroundColor}
              onChange={(event) =>
                emitChange({
                  ...currentTemplate,
                  canvas: {
                    ...currentTemplate.canvas,
                    backgroundColor: event.target.value,
                  },
                })
              }
              className="h-8 w-12 p-1"
            />
          </Label>
        </div>

        <p className="text-xs text-muted-foreground">
          Upload a background image, then add the draggable image assets that students will arrange on the board.
        </p>
      </div>

      {error ? (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      ) : null}

      <div
        ref={canvasRef}
        className={cn(
          "relative overflow-hidden rounded-xl border shadow-sm",
          dropActive ? "border-blue-400 ring-2 ring-blue-200" : "border-border"
        )}
        style={{
          aspectRatio: `${currentTemplate.canvas.width} / ${currentTemplate.canvas.height}`,
          backgroundColor: currentTemplate.canvas.backgroundColor,
          backgroundImage:
            "linear-gradient(rgba(148, 163, 184, 0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.16) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          touchAction: "none",
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDropActive(true);
        }}
        onDragLeave={() => setDropActive(false)}
        onDrop={handleCanvasDrop}
      >
        {currentTemplate.backgroundImage ? (
          <img
            src={currentTemplate.backgroundImage.src}
            alt={currentTemplate.backgroundImage.name ?? "Background"}
            className={cn(
              "absolute inset-0 h-full w-full object-cover",
              currentTemplate.backgroundImage.fit === "contain" ? "object-contain" : "object-cover"
            )}
            draggable={false}
          />
        ) : null}

        {sortedAssets.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground pointer-events-none">
            <div className="max-w-xs rounded-lg border border-dashed border-border bg-white/80 px-4 py-3 shadow-sm">
              Add a background and image assets to build the question template.
            </div>
          </div>
        ) : null}

        {sortedAssets.map((asset) => {
          const isSelected = asset.id === selectedAssetId;
          const left = `${(asset.x / currentTemplate.canvas.width) * 100}%`;
          const top = `${(asset.y / currentTemplate.canvas.height) * 100}%`;
          const width = `${(asset.width / currentTemplate.canvas.width) * 100}%`;
          const height = `${(asset.height / currentTemplate.canvas.height) * 100}%`;

          return (
            <div
              key={asset.id}
              className="absolute select-none pointer-events-auto"
              style={{
                left,
                top,
                width,
                height,
                zIndex: asset.zIndex,
              }}
              onPointerDown={(event) => handleAssetPointerDown(event, asset)}
            >
              <div
                className={cn(
                  "relative h-full w-full overflow-hidden rounded-md border bg-white shadow-sm",
                  isSelected ? "border-blue-500 ring-2 ring-blue-400/60" : "border-slate-200"
                )}
              >
                <img
                  src={asset.src}
                  alt={asset.name ?? "Asset"}
                  draggable={false}
                  className="h-full w-full select-none object-contain"
                />
                {isSelected ? (
                  <>
                    <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-blue-500/80" />
                    <div className="absolute left-1 top-1 rounded bg-blue-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white shadow">
                      {asset.name ?? "Asset"}
                    </div>
                    <button
                      type="button"
                      aria-label="Resize asset"
                      title="Resize"
                      className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded bg-blue-600 text-white shadow hover:bg-blue-700"
                      onPointerDown={(event) => startResize(event, asset)}
                    >
                      <Plus className="h-3 w-3 rotate-45" />
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <input
        ref={backgroundInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleBackgroundInputChange}
      />
      <input
        ref={assetInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleAssetInputChange}
      />
    </div>
  );
}
