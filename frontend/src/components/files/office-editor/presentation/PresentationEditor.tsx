import { useState } from 'react';
import { ModeChip } from '@/components/files/office-editor/ModeChip';
import { EmbeddedImages } from '@/components/files/office-editor/EmbeddedImages';
import { RichText } from '@/components/files/office-editor/RichText';
import { getSlidePreviewText, isPositionedShape } from '@/components/files/office-editor/utils';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';
import type { OfficeContent, OfficePresentationContent, OfficePresentationImage } from '@/types';

interface PresentationEditorProps {
  content: OfficePresentationContent;
  onChange: (content: OfficeContent) => void;
  readOnly: boolean;
}

function getPresentationImageStyles(image: OfficePresentationImage): { frameStyle: CSSProperties; imageStyle: CSSProperties } {
  const cropLeft = image.cropLeft ?? 0;
  const cropRight = image.cropRight ?? 0;
  const cropTop = image.cropTop ?? 0;
  const cropBottom = image.cropBottom ?? 0;
  const visibleWidth = Math.max(0.01, 1 - cropLeft - cropRight);
  const visibleHeight = Math.max(0.01, 1 - cropTop - cropBottom);

  return {
    frameStyle: {
      left: `${image.left}%`,
      top: `${image.top}%`,
      width: `${image.width}%`,
      height: `${image.height}%`,
      zIndex: image.index,
      transform: image.rotation ? `rotate(${image.rotation}deg)` : undefined,
      transformOrigin: 'center center',
    },
    imageStyle: {
      position: 'absolute',
      width: `${100 / visibleWidth}%`,
      height: `${100 / visibleHeight}%`,
      left: `-${(cropLeft / visibleWidth) * 100}%`,
      top: `-${(cropTop / visibleHeight) * 100}%`,
      maxWidth: 'none',
      objectFit: 'fill',
    },
  };
}

function getSlideSurfaceStyle(slide: OfficePresentationContent['slides'][number] | undefined): CSSProperties | undefined {
  if (!slide?.backgroundColor) {
    return undefined;
  }

  return {
    backgroundColor: slide.backgroundColor.startsWith('#') ? slide.backgroundColor : `#${slide.backgroundColor}`,
  };
}

export function PresentationEditor({ content, onChange, readOnly }: PresentationEditorProps) {
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const activeSlide = content.slides[activeSlideIndex] ?? content.slides[0];
  const positionedShapes = activeSlide?.shapes.filter(isPositionedShape) ?? [];
  const flowShapes = activeSlide?.shapes.filter((shape) => !isPositionedShape(shape)) ?? [];
  const activeSlideImages = activeSlide?.images ?? [];
  const hasCustomSlideBackground = Boolean(activeSlide?.backgroundColor || activeSlide?.backgroundImage);

  const updateSlide = (slideIndex: number, nextSlide: OfficePresentationContent['slides'][number]) => {
    onChange({
      ...content,
      slides: content.slides.map((slide, currentIndex) => (currentIndex === slideIndex ? nextSlide : slide)),
    });
  };

  const updateTitle = (value: string) => {
    if (!activeSlide) {
      return;
    }
    updateSlide(activeSlideIndex, { ...activeSlide, title: value });
  };

  const updateShapeText = (shapeIndex: number, value: string) => {
    if (!activeSlide) {
      return;
    }

    updateSlide(activeSlideIndex, {
      ...activeSlide,
      shapes: activeSlide.shapes.map((shape, currentIndex) => (
        currentIndex === shapeIndex ? { ...shape, text: value } : shape
      )),
    });
  };

  return (
    <div className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900/80">
      <div className="grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="border-r border-gray-200 bg-gray-50/80 p-4 dark:border-white/10 dark:bg-slate-950/40">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-slate-500">Storyboard</p>
              <h2 className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">Presentation deck</h2>
            </div>
            <ModeChip className="border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300">{readOnly ? 'Viewing' : 'Editing'}</ModeChip>
          </div>

          <div className="space-y-3">
            {content.slides.map((slide, index) => (
              <button
                key={`slide-${index}`}
                type="button"
                onClick={() => setActiveSlideIndex(index)}
                className={cn(
                  'flex w-full items-start gap-3 rounded-[18px] border p-3 text-left transition-colors',
                  index === activeSlideIndex
                    ? 'border-blue-200 bg-white shadow-sm dark:border-cyan-300/30 dark:bg-slate-900'
                    : 'border-transparent bg-white/50 hover:bg-white dark:bg-slate-900/40 dark:hover:bg-slate-900/70'
                )}
              >
                <span className="pt-1 text-sm font-semibold text-gray-500 dark:text-slate-500">{index + 1}</span>
                <div className="w-full rounded-[14px] border border-gray-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-slate-900/90">
                  <div className="relative aspect-video overflow-hidden rounded-[10px] border border-gray-200 bg-white px-2 py-1.5 dark:border-white/10 dark:bg-slate-950/80" style={getSlideSurfaceStyle(slide)}>
                    {slide.backgroundImage ? (
                      <img
                        src={slide.backgroundImage.dataUri}
                        alt={slide.backgroundImage.altText || slide.backgroundImage.name || `Slide ${index + 1} background`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : null}
                    {!slide.backgroundImage && !slide.backgroundColor ? (
                      <div className="absolute inset-0 bg-[linear-gradient(160deg,#ffffff_0%,#f3f4f6_100%)] dark:bg-[linear-gradient(160deg,rgba(15,23,42,0.85)_0%,rgba(2,6,23,0.95)_100%)]" />
                    ) : null}
                    <div className="relative mt-0">
                    <p className="truncate text-[10px] font-semibold text-gray-900 dark:text-white">{slide.title || 'Untitled slide'}</p>
                    <div className="mt-1 space-y-1">
                      {slide.shapes.slice(0, 3).map((shape) => (
                        <p key={`thumb-shape-${shape.index}`} className="truncate text-[9px] text-gray-600 dark:text-slate-400">
                          {getSlidePreviewText(shape) || shape.name}
                        </p>
                      ))}
                    </div>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 bg-gray-50 dark:bg-slate-950/60">
          <div className="border-b border-gray-200 p-6 dark:border-white/10">
            <div className="mx-auto max-w-[1120px]">
              <div className="mx-auto aspect-video max-w-[960px] rounded-[24px] bg-white shadow-[0_24px_64px_rgba(15,23,42,0.12)] dark:bg-slate-900">
                <div className="relative h-full w-full overflow-hidden rounded-[24px]" style={getSlideSurfaceStyle(activeSlide)}>
                  {activeSlide?.backgroundImage ? (
                    <img
                      src={activeSlide.backgroundImage.dataUri}
                      alt={activeSlide.backgroundImage.altText || activeSlide.backgroundImage.name || 'Slide background'}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : null}
                  {!hasCustomSlideBackground ? (
                    <>
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,#ffffff_0%,#f3f4f6_100%)] dark:bg-[linear-gradient(160deg,rgba(15,23,42,0.84)_0%,rgba(2,6,23,0.96)_100%)]" />
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.08),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_32%)]" />
                    </>
                  ) : null}
                  <div className="absolute inset-0 px-[6%] py-[7%]">
                    <div
                      className="max-w-[72%] whitespace-pre-wrap break-words text-gray-900 dark:text-white"
                      style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", serif', fontSize: '28pt', fontWeight: 700, lineHeight: 1.2 }}
                    >
                      <RichText runs={activeSlide?.titleRuns} fallback={activeSlide?.title || 'Untitled slide'} />
                    </div>

                    <div className="mt-10 space-y-4">
                      {flowShapes.map((shape) => (
                        <div
                          key={`flow-shape-${shape.index}`}
                          className="whitespace-pre-wrap break-words rounded-[14px] border border-white/70 bg-white/75 px-3 py-2 text-gray-800 backdrop-blur-sm dark:border-white/10 dark:bg-slate-900/70 dark:text-slate-100"
                          style={{ fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif', lineHeight: 1.3 }}
                        >
                          {shape.text || shape.runs?.length ? (
                            <RichText runs={shape.runs} fallback={shape.text || ''} />
                          ) : (
                            <span className="text-gray-400 dark:text-slate-500">Empty text box</span>
                          )}
                        </div>
                      ))}

                      {flowShapes.length === 0 && positionedShapes.length === 0 ? (
                        <div className="pt-8 text-sm text-gray-400 dark:text-slate-500">This slide has no editable text placeholders.</div>
                      ) : null}
                    </div>
                  </div>

                  {activeSlideImages.map((image) => {
                    const { frameStyle, imageStyle } = getPresentationImageStyles(image);
                    return (
                      <div
                        key={`slide-image-${image.index}`}
                        className="absolute overflow-hidden"
                        style={frameStyle}
                      >
                        <img
                          src={image.dataUri}
                          alt={image.altText || image.name}
                          className="pointer-events-none h-full w-full"
                          style={imageStyle}
                        />
                      </div>
                    );
                  })}

                  {positionedShapes.map((shape) => (
                    <div
                      key={`positioned-shape-${shape.index}`}
                      className="absolute overflow-hidden whitespace-pre-wrap break-words rounded-[12px] border border-white/60 bg-white/50 px-2 py-1 text-gray-800 backdrop-blur-[1px] dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100"
                      style={{
                        left: `${shape.left}%`,
                        top: `${shape.top}%`,
                        width: `${shape.width}%`,
                        height: `${shape.height}%`,
                        zIndex: shape.index,
                        fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
                        lineHeight: 1.25,
                      }}
                    >
                      {shape.text || shape.runs?.length ? (
                        <RichText runs={shape.runs} fallback={shape.text || ''} />
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500">Empty text box</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white/70 p-6 dark:bg-slate-950/30">
            <div className="mx-auto max-w-[1120px] rounded-[24px] border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-900/80">
              <Input label="Slide title" value={activeSlide?.title ?? ''} onChange={(event) => updateTitle(event.target.value)} disabled={readOnly} />

              <div className="mt-5 space-y-3">
                {activeSlide?.shapes.length ? activeSlide.shapes.map((shape, index) => (
                  <div key={`shape-${shape.index}`} className="rounded-[18px] border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-slate-950/30">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-slate-500">{shape.name}</p>
                    <textarea
                      value={shape.text}
                      onChange={(event) => updateShapeText(index, event.target.value)}
                      readOnly={readOnly}
                      className="min-h-[120px] w-full resize-y rounded-[14px] border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 read-only:bg-gray-50 dark:border-white/10 dark:bg-slate-950 dark:text-white dark:focus:border-cyan-300 dark:focus:ring-cyan-300/20 dark:read-only:bg-slate-900"
                    />
                  </div>
                )) : (
                  <div className="rounded-[18px] border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-sm text-gray-500 dark:border-white/10 dark:bg-slate-950/30 dark:text-slate-400">
                    This slide has no editable text placeholders.
                  </div>
                )}
              </div>

              {content.images?.length ? <EmbeddedImages images={content.images} caption="Unplaced deck media preserved alongside slide content." /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}