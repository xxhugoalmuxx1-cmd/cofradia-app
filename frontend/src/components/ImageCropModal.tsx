import { useEffect, useRef, useState } from "react";

interface Props {
  file: File;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
  shape?: "circle" | "square";
}

// Editor de imagen sencillo: permite arrastrar para reposicionar y hacer
// zoom antes de subir la foto (tanto para la imagen de la Virgen como
// para las fotos de producto). No usa librerías externas: dibuja el
// resultado final en un <canvas> oculto y lo exporta como Blob.
const OUTPUT_SIZE = 600;

export function ImageCropModal({ file, onCancel, onConfirm, shape = "square" }: Props) {
  const [imgUrl, setImgUrl] = useState<string>("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function startDrag(x: number, y: number) {
    dragging.current = true;
    lastPos.current = { x, y };
  }
  function moveDrag(x: number, y: number) {
    if (!dragging.current) return;
    const dx = x - lastPos.current.x;
    const dy = y - lastPos.current.y;
    lastPos.current = { x, y };
    setOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  }
  function endDrag() {
    dragging.current = false;
  }

  function confirm() {
    const img = imgRef.current;
    const container = containerRef.current;
    if (!img || !container) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const containerSize = container.clientWidth;
    const scale = OUTPUT_SIZE / containerSize;

    // Tamaño mostrado de la imagen (respetando el "cover" inicial + zoom)
    const baseScale = Math.max(containerSize / img.naturalWidth, containerSize / img.naturalHeight);
    const displayW = img.naturalWidth * baseScale * zoom;
    const displayH = img.naturalHeight * baseScale * zoom;

    const drawX = (containerSize / 2 - displayW / 2 + offset.x) * scale;
    const drawY = (containerSize / 2 - displayH / 2 + offset.y) * scale;

    ctx.drawImage(img, drawX, drawY, displayW * scale, displayH * scale);

    canvas.toBlob((blob) => blob && onConfirm(blob), "image/jpeg", 0.9);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-sm">
        <h2 className="font-medium mb-3 text-center">Ajusta la imagen</h2>
        <div
          ref={containerRef}
          className={`relative w-full aspect-square overflow-hidden bg-gray-100 mx-auto touch-none select-none ${
            shape === "circle" ? "rounded-full" : "rounded-lg"
          }`}
          onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
          onMouseMove={(e) => moveDrag(e.clientX, e.clientY)}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={(e) => startDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchMove={(e) => moveDrag(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={endDrag}
        >
          {imgUrl && (
            <img
              ref={imgRef}
              src={imgUrl}
              alt="Ajustar"
              draggable={false}
              className="absolute top-1/2 left-1/2 w-full h-full object-cover pointer-events-none"
              style={{
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
              }}
            />
          )}
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">Arrastra para mover · usa el control para hacer zoom</p>
        <input
          type="range"
          min="1"
          max="3"
          step="0.05"
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full mt-2"
        />
        <div className="flex gap-2 mt-4">
          <button onClick={onCancel} className="flex-1 bg-gray-200 rounded-lg py-2 text-sm">
            Cancelar
          </button>
          <button onClick={confirm} className="flex-1 bg-brand text-white rounded-lg py-2 text-sm">
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
