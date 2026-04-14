import { useRef, useState } from "react";
import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { ImageSlotStatus } from "@/lib/preview/imageSlotApi";

type Props = {
  slotKey: string;
  status: ImageSlotStatus | "idle";
  imageUrl: string | null;
  /** Called when the user requests AI generation (first time or regenerate). */
  onGenerate: (instruction?: string) => void;
  /** Called when the user uploads a file. */
  onUpload: (file: File) => void;
  /** Called when the user removes the image. */
  onRemove?: () => void;
  /** Max file size in KB (from LayoutSlotSchema). */
  maxKb?: number;
  disabled?: boolean;
};

const MAX_KB_DEFAULT = 512;

export function ImageSlot({
  slotKey,
  status,
  imageUrl,
  onGenerate,
  onUpload,
  onRemove,
  maxKb = MAX_KB_DEFAULT,
  disabled = false,
}: Props) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [instruction, setInstruction] = useState("");
  const [showInstruction, setShowInstruction] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const busy = status === "generating";

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    if (file.size > maxKb * 1024) {
      setUploadError(t("wizard.preview.imageSlot.errorFileSize", { maxKb }));
      return;
    }
    onUpload(file);
    // Reset input so the same file can be re-selected if needed
    e.target.value = "";
  }

  function handleGenerateClick() {
    if (showInstruction) {
      onGenerate(instruction.trim() || undefined);
      setInstruction("");
      setShowInstruction(false);
    } else {
      onGenerate();
    }
  }

  const isFirstTime = !imageUrl && status !== "generating";

  return (
    <div
      className="preview-image-slot"
      data-slot-key={slotKey}
      aria-label={t("wizard.preview.imageSlot.ariaLabel", { slot: slotKey })}
    >
      {/* Image display or placeholder */}
      {imageUrl ? (
        <div className="preview-image-slot__display">
          <img
            src={imageUrl}
            alt=""
            aria-hidden
            className="preview-image-slot__img"
          />
        </div>
      ) : (
        <div
          className="preview-image-slot__placeholder"
          aria-hidden
        >
          <ImagePlus className="size-8 text-obra-neutral-400" />
        </div>
      )}

      {/* Live region for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic
        className="sr-only"
      >
        {busy ? t("wizard.preview.imageSlot.generating") : ""}
      </div>

      {/* Controls */}
      <div className="preview-image-slot__controls">
        {busy ? (
          <span className="flex items-center gap-2 text-xs text-obra-neutral-600">
            <RefreshCw className="size-3.5 animate-spin" aria-hidden />
            {t("wizard.preview.imageSlot.generating")}
          </span>
        ) : (
          <>
            {/* Regenerate with optional instruction */}
            {imageUrl && !showInstruction ? (
              <Button
                type="button"
                variant="tertiary"
                size="small"
                disabled={disabled}
                onClick={() => setShowInstruction(true)}
              >
                <RefreshCw className="size-3.5" aria-hidden />
                {t("wizard.preview.imageSlot.regenerate")}
              </Button>
            ) : null}

            {/* Generate first time */}
            {isFirstTime ? (
              <Button
                type="button"
                variant="primary"
                size="small"
                disabled={disabled}
                onClick={handleGenerateClick}
              >
                <ImagePlus className="size-3.5" aria-hidden />
                {t("wizard.preview.imageSlot.generate")}
              </Button>
            ) : null}

            {/* Instruction input for regenerate */}
            {showInstruction ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder={t("wizard.preview.imageSlot.instructionPlaceholder")}
                  className="w-full rounded-input border border-obra-blue-100 px-3 py-1.5 text-sm text-obra-blue-950 placeholder:text-obra-neutral-400 focus:border-obra-blue-700 focus:outline-none"
                  maxLength={400}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="small"
                    disabled={disabled}
                    onClick={handleGenerateClick}
                  >
                    {t("wizard.preview.imageSlot.regenerate")}
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="small"
                    onClick={() => { setShowInstruction(false); setInstruction(""); }}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Upload button */}
            <Button
              type="button"
              variant="tertiary"
              size="small"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
            >
              {t("wizard.preview.imageSlot.upload")}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              aria-hidden
              onChange={handleFileChange}
            />

            {/* Remove */}
            {imageUrl && onRemove ? (
              <Button
                type="button"
                variant="ghost"
                size="small"
                disabled={disabled}
                onClick={onRemove}
                aria-label={t("wizard.preview.imageSlot.remove")}
              >
                <Trash2 className="size-3.5 text-obra-neutral-600" />
              </Button>
            ) : null}
          </>
        )}
      </div>

      {/* Upload error */}
      {uploadError ? (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {uploadError}
        </p>
      ) : null}
    </div>
  );
}
